'use strict'

const debug = require('debug')
const log = debug('libp2p:upgrader')
log.error = debug('libp2p:upgrader:error')
const Multistream = require('multistream-select')
const { Connection } = require('libp2p-interfaces/src/connection')
const PeerId = require('peer-id')
const pipe = require('it-pipe')
const errCode = require('err-code')

const { codes } = require('./errors')

/**
 * @typedef MultiaddrConnection
 * @property {function} sink
 * @property {AsyncIterator} source
 * @property {*} conn
 * @property {Multiaddr} remoteAddr
 */

/**
 * @typedef CryptoResult
 * @property {*} conn A duplex iterable
 * @property {PeerId} remotePeer
 * @property {string} protocol
 */

class Upgrader {
  /**
   * @param {object} options
   * @param {PeerId} options.localPeer
   * @param {Map<string, Crypto>} options.cryptos
   * @param {Map<string, Muxer>} options.muxers
   * @param {function(Connection)} options.onConnection Called when a connection is upgraded
   * @param {function(Connection)} options.onConnectionEnd
   */
  constructor ({
    localPeer,
    cryptos,
    muxers,
    onConnectionEnd = () => {},
    onConnection = () => {}
  }) {
    this.localPeer = localPeer
    this.cryptos = cryptos || new Map()
    this.muxers = muxers || new Map()
    this.protector = null
    this.protocols = new Map()
    this.onConnection = onConnection
    this.onConnectionEnd = onConnectionEnd
  }

  /**
   * Upgrades an inbound connection
   * @async
   * @param {MultiaddrConnection} maConn
   * @returns {Promise<Connection>}
   */
  async upgradeInbound (maConn) {
    let encryptedConn
    let remotePeer
    let muxedConnection
    let Muxer
    let cryptoProtocol

    log('Starting the inbound connection upgrade')

    // Protect
    let protectedConn = maConn
    if (this.protector) {
      protectedConn = await this.protector.protect(maConn)
    }

    try {
      // Encrypt the connection
      ({
        conn: encryptedConn,
        remotePeer,
        protocol: cryptoProtocol
      } = await this._encryptInbound(this.localPeer, protectedConn, this.cryptos))

      // Multiplex the connection
      ;({ stream: muxedConnection, Muxer } = await this._multiplexInbound(encryptedConn, this.muxers))
    } catch (err) {
      log.error('Failed to upgrade inbound connection', err)
      await maConn.close(err)
      // TODO: We shouldn't throw here, as there isn't anything to catch the failure
      throw err
    }

    log('Successfully upgraded inbound connection')

    return this._createConnection({
      cryptoProtocol,
      direction: 'inbound',
      maConn,
      muxedConnection,
      Muxer,
      remotePeer
    })
  }

  /**
   * Upgrades an outbound connection
   * @async
   * @param {MultiaddrConnection} maConn
   * @returns {Promise<Connection>}
   */
  async upgradeOutbound (maConn) {
    let remotePeerId
    try {
      remotePeerId = PeerId.createFromB58String(maConn.remoteAddr.getPeerId())
    } catch (err) {
      log.error('multiaddr did not contain a valid peer id', err)
    }

    let encryptedConn
    let remotePeer
    let muxedConnection
    let cryptoProtocol
    let Muxer

    log('Starting the outbound connection upgrade')

    // Protect
    let protectedConn = maConn
    if (this.protector) {
      protectedConn = await this.protector.protect(maConn)
    }

    try {
      // Encrypt the connection
      ({
        conn: encryptedConn,
        remotePeer,
        protocol: cryptoProtocol
      } = await this._encryptOutbound(this.localPeer, protectedConn, remotePeerId, this.cryptos))

      // Multiplex the connection
      ;({ stream: muxedConnection, Muxer } = await this._multiplexOutbound(encryptedConn, this.muxers))
    } catch (err) {
      log.error('Failed to upgrade outbound connection', err)
      await maConn.close(err)
      throw err
    }

    log('Successfully upgraded outbound connection')

    return this._createConnection({
      cryptoProtocol,
      direction: 'outbound',
      maConn,
      muxedConnection,
      Muxer,
      remotePeer
    })
  }

  /**
   * A convenience method for generating a new `Connection`
   * @private
   * @param {object} options
   * @param {string} cryptoProtocol The crypto protocol that was negotiated
   * @param {string} direction One of ['inbound', 'outbound']
   * @param {MultiaddrConnection} maConn The transport layer connection
   * @param {*} muxedConnection A duplex connection returned from multiplexer selection
   * @param {Muxer} Muxer The muxer to be used for muxing
   * @param {PeerId} remotePeer The peer the connection is with
   * @returns {Connection}
   */
  _createConnection ({
    cryptoProtocol,
    direction,
    maConn,
    muxedConnection,
    Muxer,
    remotePeer
  }) {
    // Create the muxer
    const muxer = new Muxer({
      // Run anytime a remote stream is created
      onStream: async muxedStream => {
        const mss = new Multistream.Listener(muxedStream)
        const { stream, protocol } = await mss.handle(Array.from(this.protocols.keys()))
        log('%s: incoming stream opened on %s', direction, protocol)
        connection.addStream(stream, protocol)
        this._onStream({ connection, stream, protocol })
      },
      // Run anytime a stream closes
      onStreamEnd: muxedStream => {
        connection.removeStream(muxedStream.id)
      }
    })

    const newStream = async protocols => {
      log('%s: starting new stream on %s', direction, protocols)
      const muxedStream = muxer.newStream()
      const mss = new Multistream.Dialer(muxedStream)
      try {
        const { stream, protocol } = await mss.select(protocols)
        return { stream: { ...muxedStream, ...stream }, protocol }
      } catch (err) {
        log.error('could not create new stream', err)
        throw errCode(err, codes.ERR_UNSUPPORTED_PROTOCOL)
      }
    }

    // Pipe all data through the muxer
    pipe(muxedConnection, muxer, muxedConnection)

    maConn.timeline.upgraded = Date.now()
    const timelineProxy = new Proxy(maConn.timeline, {
      set: (...args) => {
        if (args[1] === 'close' && args[2]) {
          this.onConnectionEnd(connection)
        }

        return Reflect.set(...args)
      }
    })

    // Create the connection
    const connection = new Connection({
      localAddr: maConn.localAddr,
      remoteAddr: maConn.remoteAddr,
      localPeer: this.localPeer,
      remotePeer: remotePeer,
      stat: {
        direction,
        timeline: timelineProxy,
        multiplexer: Muxer.multicodec,
        encryption: cryptoProtocol
      },
      newStream,
      getStreams: () => muxer.streams,
      close: err => maConn.close(err)
    })

    this.onConnection(connection)

    return connection
  }

  /**
   * Routes incoming streams to the correct handler
   * @private
   * @param {object} options
   * @param {Connection} options.connection The connection the stream belongs to
   * @param {Stream} options.stream
   * @param {string} options.protocol
   */
  _onStream ({ connection, stream, protocol }) {
    const handler = this.protocols.get(protocol)
    handler({ connection, stream, protocol })
  }

  /**
   * Attempts to encrypt the incoming `connection` with the provided `cryptos`.
   * @private
   * @async
   * @param {PeerId} localPeer The initiators PeerInfo
   * @param {*} connection
   * @param {Map<string, Crypto>} cryptos
   * @returns {CryptoResult} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
   */
  async _encryptInbound (localPeer, connection, cryptos) {
    const mss = new Multistream.Listener(connection)
    const protocols = Array.from(cryptos.keys())
    log('handling inbound crypto protocol selection', protocols)

    try {
      const { stream, protocol } = await mss.handle(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting inbound connection...')

      return {
        ...await crypto.secureInbound(localPeer, stream),
        protocol
      }
    } catch (err) {
      throw errCode(err, codes.ERR_ENCRYPTION_FAILED)
    }
  }

  /**
   * Attempts to encrypt the given `connection` with the provided `cryptos`.
   * The first `Crypto` module to succeed will be used
   * @private
   * @async
   * @param {PeerId} localPeer The initiators PeerInfo
   * @param {*} connection
   * @param {PeerId} remotePeerId
   * @param {Map<string, Crypto>} cryptos
   * @returns {CryptoResult} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
   */
  async _encryptOutbound (localPeer, connection, remotePeerId, cryptos) {
    const mss = new Multistream.Dialer(connection)
    const protocols = Array.from(cryptos.keys())
    log('selecting outbound crypto protocol', protocols)

    try {
      const { stream, protocol } = await mss.select(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting outbound connection to %j', remotePeerId)

      return {
        ...await crypto.secureOutbound(localPeer, stream, remotePeerId),
        protocol
      }
    } catch (err) {
      throw errCode(err, codes.ERR_ENCRYPTION_FAILED)
    }
  }

  /**
   * Selects one of the given muxers via multistream-select. That
   * muxer will be used for all future streams on the connection.
   * @private
   * @async
   * @param {*} connection A basic duplex connection to multiplex
   * @param {Map<string, Muxer>} muxers The muxers to attempt multiplexing with
   * @returns {*} A muxed connection
   */
  async _multiplexOutbound (connection, muxers) {
    const dialer = new Multistream.Dialer(connection)
    const protocols = Array.from(muxers.keys())
    log('outbound selecting muxer %s', protocols)
    try {
      const { stream, protocol } = await dialer.select(protocols)
      log('%s selected as muxer protocol', protocol)
      const Muxer = muxers.get(protocol)
      return { stream, Muxer }
    } catch (err) {
      throw errCode(err, codes.ERR_MUXER_UNAVAILABLE)
    }
  }

  /**
   * Registers support for one of the given muxers via multistream-select. The
   * selected muxer will be used for all future streams on the connection.
   * @private
   * @async
   * @param {*} connection A basic duplex connection to multiplex
   * @param {Map<string, Muxer>} muxers The muxers to attempt multiplexing with
   * @returns {*} A muxed connection
   */
  async _multiplexInbound (connection, muxers) {
    const listener = new Multistream.Listener(connection)
    const protocols = Array.from(muxers.keys())
    log('inbound handling muxers %s', protocols)
    try {
      const { stream, protocol } = await listener.handle(protocols)
      const Muxer = muxers.get(protocol)
      return { stream, Muxer }
    } catch (err) {
      throw errCode(err, codes.ERR_MUXER_UNAVAILABLE)
    }
  }
}

module.exports = Upgrader

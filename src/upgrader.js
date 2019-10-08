'use strict'

const debug = require('debug')
const log = debug('libp2p:upgrader')
log.error = debug('libp2p:upgrader:error')
const Multistream = require('multistream-select')
const { Connection } = require('interface-connection')
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

class Upgrader {
  /**
   * @param {object} options
   * @param {PeerId} options.localPeer
   * @param {Map<string, Crypto>} options.cryptos
   * @param {Map<string, Muxer>} options.muxers
   */
  constructor ({ localPeer, cryptos, muxers }) {
    this.localPeer = localPeer
    this.cryptos = cryptos || new Map()
    this.muxers = muxers || new Map()
    this.protocols = new Map()
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

    try {
      // Encrypt the connection
      ({
        conn: encryptedConn,
        remotePeer,
        protocol: cryptoProtocol
      } = await this._encryptInbound(this.localPeer, maConn, this.cryptos))

      // Multiplex the connection
      ;({ stream: muxedConnection, Muxer } = await this._multiplexInbound(encryptedConn, this.muxers))
    } catch (err) {
      log.error('Failed to upgrade inbound connection', err)
      await maConn.close(err)
      throw err
    }

    log('Successfully upgraded inbound connection')

    // Create the muxer
    const muxer = new Muxer({
      // Run anytime a remote stream is opened
      onStream: async muxedStream => {
        const mss = new Multistream.Listener(muxedStream)
        const { stream, protocol } = await mss.handle(Array.from(this.protocols.keys()))
        log('inbound: incoming stream opened on %s', protocol)
        connection.addStream(stream, protocol)
        this._onStream({ stream, protocol })
      },
      // Run anytime a stream ends
      onStreamEnd: muxedStream => {
        connection.removeStream(muxedStream.id)
      }
    })

    // Called whenever a user requests a new stream
    const newStream = async protocols => {
      log('inbound: starting new stream on %s', protocols)
      const muxedStream = muxer.newStream()
      const mss = new Multistream.Dialer(muxedStream)
      try {
        const { stream, protocol } = await mss.select(protocols)
        return { stream: { ...muxedStream, ...stream }, protocol }
      } catch (err) {
        log.error('could not create new stream for protocols %s', protocols, err)
        throw errCode(err, 'ERR_UNSUPPORTED_PROTOCOL')
      }
    }

    // Pipe all data through the muxer
    pipe(muxedConnection, muxer, muxedConnection)

    // Create the connection
    const connection = new Connection({
      localAddr: maConn.localAddr,
      remoteAddr: maConn.remoteAddr,
      localPeer: this.localPeer,
      remotePeer,
      stat: {
        direction: 'inbound',
        timeline: {
          open: maConn.timeline.open,
          upgraded: Date.now()
        },
        multiplexer: Muxer.multicodec,
        encryption: cryptoProtocol
      },
      newStream,
      getStreams: () => muxer.streams,
      close: err => maConn.close(err)
    })

    return connection
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
      log.error(err)
    }

    let encryptedConn
    let remotePeer
    let muxedConnection
    let cryptoProtocol
    let Muxer

    try {
      // Encrypt the connection
      ({
        conn: encryptedConn,
        remotePeer,
        protocol: cryptoProtocol
      } = await this._encryptOutbound(this.localPeer, maConn, remotePeerId, this.cryptos))

      // Multiplex the connection
      ;({ stream: muxedConnection, Muxer } = await this._multiplexOutbound(encryptedConn, this.muxers))
    } catch (err) {
      log.error('Failed to upgrade outbound connection', err)
      await maConn.close(err)
      throw err
    }

    log('Successfully upgraded outbound connection')

    // Create the muxer
    const muxer = new Muxer({
      // Run anytime a remote stream is created
      onStream: async muxedStream => {
        const mss = new Multistream.Listener(muxedStream)
        const { stream, protocol } = await mss.handle(this._protocols)
        log('outbound: incoming stream opened on %s', protocol)
        connection.addStream(stream, protocol)
        this._onStream({ stream, protocol })
      },
      // Run anytime a stream closes
      onStreamEnd: muxedStream => {
        connection.removeStream(muxedStream.id)
      }
    })

    const newStream = async protocols => {
      log('outbound: starting new stream on %s', protocols)
      const muxedStream = muxer.newStream()
      const mss = new Multistream.Dialer(muxedStream)
      try {
        const { stream, protocol } = await mss.select(protocols)
        return { stream: { ...muxedStream, ...stream }, protocol }
      } catch (err) {
        log.error('could not create new stream', err)
        throw errCode(err, 'ERR_UNSUPPORTED_PROTOCOL')
      }
    }

    // Pipe all data through the muxer
    pipe(muxedConnection, muxer, muxedConnection)

    // Create the connection
    const connection = new Connection({
      localAddr: maConn.localAddr,
      remoteAddr: maConn.remoteAddr,
      localPeer: this.localPeer,
      remotePeer: remotePeer,
      stat: {
        direction: 'outbound',
        timeline: {
          open: maConn.timeline.open,
          upgraded: Date.now()
        },
        multiplexer: Muxer.multicodec,
        encryption: cryptoProtocol
      },
      newStream,
      getStreams: () => muxer.streams,
      close: err => maConn.close(err)
    })

    return connection
  }

  /**
   * Routes incoming streams to the correct handler
   * @private
   * @param {object} options
   * @param {Stream} options.stream
   * @param {string} protocol
   */
  _onStream ({ stream, protocol }) {
    const handler = this.protocols.get(protocol)
    handler(stream)
  }

  /**
   * Attempts to encrypt the incoming `connection` with the provided `cryptos`.
   * @private
   * @async
   * @param {PeerId} localPeer The initiators PeerInfo
   * @param {*} connection
   * @param {Map<string, Crypto>} cryptos
   * @returns {[connection, string]} An encrypted connection and the tag of the `Crypto` used
   */
  async _encryptInbound (localPeer, connection, cryptos) {
    const mss = new Multistream.Listener(connection)
    const protocols = Array.from(cryptos.keys())
    log('selecting inbound crypto protocol', protocols)

    try {
      const { stream, protocol } = await mss.handle(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting inbound connection...')
      const cryptoResponse = await crypto.secureInbound(localPeer, stream)

      if (cryptoResponse) {
        return {
          ...cryptoResponse,
          protocol
        }
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
   * @returns {[connection, string]} An encrypted connection and the tag of the `Crypto` used
   */
  async _encryptOutbound (localPeer, connection, remotePeerId, cryptos) {
    const mss = new Multistream.Dialer(connection)
    const protocols = Array.from(cryptos.keys())
    log('selecting outbound crypto protocol', protocols)

    try {
      const { stream, protocol } = await mss.select(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting outbound connection to %s', remotePeerId.toB58String())
      const cryptoResponse = await crypto.secureOutbound(localPeer, stream, remotePeerId)

      return {
        ...cryptoResponse,
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

'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:upgrader'), {
  error: debug('libp2p:upgrader:err')
})
const errCode = require('err-code')
// @ts-ignore multistream-select does not export types
const Multistream = require('multistream-select')
const { Connection } = require('libp2p-interfaces/src/connection')
const PeerId = require('peer-id')
const { pipe } = require('it-pipe')
// @ts-ignore mutable-proxy does not export types
const mutableProxy = require('mutable-proxy')

const { codes } = require('./errors')

/**
 * @typedef {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} MultiaddrConnection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory} MuxerFactory
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').Muxer} Muxer
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('libp2p-interfaces/src/crypto/types').Crypto} Crypto
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @typedef CryptoResult
 * @property {MultiaddrConnection} conn A duplex iterable
 * @property {PeerId} remotePeer
 * @property {string} protocol
 */

class Upgrader {
  /**
   * @param {object} options
   * @param {PeerId} options.localPeer
   * @param {import('./metrics')} [options.metrics]
   * @param {Map<string, Crypto>} [options.cryptos]
   * @param {Map<string, MuxerFactory>} [options.muxers]
   * @param {(connection: Connection) => void} options.onConnection - Called when a connection is upgraded
   * @param {(connection: Connection) => void} options.onConnectionEnd
   */
  constructor ({
    localPeer,
    metrics,
    cryptos = new Map(),
    muxers = new Map(),
    onConnectionEnd = () => {},
    onConnection = () => {}
  }) {
    this.localPeer = localPeer
    this.metrics = metrics
    this.cryptos = cryptos
    this.muxers = muxers
    /** @type {import("./pnet") | null} */
    this.protector = null
    this.protocols = new Map()
    this.onConnection = onConnection
    this.onConnectionEnd = onConnectionEnd
  }

  /**
   * Upgrades an inbound connection
   *
   * @async
   * @param {MultiaddrConnection} maConn
   * @returns {Promise<Connection>}
   */
  async upgradeInbound (maConn) {
    let encryptedConn
    let remotePeer
    let upgradedConn
    let Muxer
    let cryptoProtocol
    let setPeer
    let proxyPeer

    if (this.metrics) {
      ({ setTarget: setPeer, proxy: proxyPeer } = mutableProxy())
      const idString = (Math.random() * 1e9).toString(36) + Date.now()
      setPeer({ toB58String: () => idString })
      maConn = this.metrics.trackStream({ stream: maConn, remotePeer: proxyPeer })
    }

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
      if (this.muxers.size) {
        ({ stream: upgradedConn, Muxer } = await this._multiplexInbound(encryptedConn, this.muxers))
      } else {
        upgradedConn = encryptedConn
      }
    } catch (err) {
      log.error('Failed to upgrade inbound connection', err)
      await maConn.close(err)
      throw err
    }

    if (this.metrics) {
      this.metrics.updatePlaceholder(proxyPeer, remotePeer)
      setPeer(remotePeer)
    }

    log('Successfully upgraded inbound connection')

    return this._createConnection({
      cryptoProtocol,
      direction: 'inbound',
      maConn,
      upgradedConn,
      Muxer,
      remotePeer
    })
  }

  /**
   * Upgrades an outbound connection
   *
   * @async
   * @param {MultiaddrConnection} maConn
   * @returns {Promise<Connection>}
   */
  async upgradeOutbound (maConn) {
    const idStr = maConn.remoteAddr.getPeerId()
    if (!idStr) {
      throw errCode(new Error('outbound connection must have a peer id'), codes.ERR_INVALID_MULTIADDR)
    }

    const remotePeerId = PeerId.createFromB58String(idStr)

    let encryptedConn
    let remotePeer
    let upgradedConn
    let cryptoProtocol
    let Muxer
    let setPeer
    let proxyPeer

    if (this.metrics) {
      ({ setTarget: setPeer, proxy: proxyPeer } = mutableProxy())
      const idString = (Math.random() * 1e9).toString(36) + Date.now()
      setPeer({ toB58String: () => idString })
      maConn = this.metrics.trackStream({ stream: maConn, remotePeer: proxyPeer })
    }

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
      if (this.muxers.size) {
        ({ stream: upgradedConn, Muxer } = await this._multiplexOutbound(encryptedConn, this.muxers))
      } else {
        upgradedConn = encryptedConn
      }
    } catch (err) {
      log.error('Failed to upgrade outbound connection', err)
      await maConn.close(err)
      throw err
    }

    if (this.metrics) {
      this.metrics.updatePlaceholder(proxyPeer, remotePeer)
      setPeer(remotePeer)
    }

    log('Successfully upgraded outbound connection')

    return this._createConnection({
      cryptoProtocol,
      direction: 'outbound',
      maConn,
      upgradedConn,
      Muxer,
      remotePeer
    })
  }

  /**
   * A convenience method for generating a new `Connection`
   *
   * @private
   * @param {object} options
   * @param {string} options.cryptoProtocol - The crypto protocol that was negotiated
   * @param {'inbound' | 'outbound'} options.direction - One of ['inbound', 'outbound']
   * @param {MultiaddrConnection} options.maConn - The transport layer connection
   * @param {MuxedStream | MultiaddrConnection} options.upgradedConn - A duplex connection returned from multiplexer and/or crypto selection
   * @param {MuxerFactory} [options.Muxer] - The muxer to be used for muxing
   * @param {PeerId} options.remotePeer - The peer the connection is with
   * @returns {Connection}
   */
  _createConnection ({
    cryptoProtocol,
    direction,
    maConn,
    upgradedConn,
    Muxer,
    remotePeer
  }) {
    /** @type {import("libp2p-interfaces/src/stream-muxer/types").Muxer} */
    let muxer
    /** @type {import("libp2p-interfaces/src/connection/connection").CreatedMuxedStream | undefined} */
    let newStream
    /** @type {Connection} */
    let connection // eslint-disable-line prefer-const

    if (Muxer) {
      // Create the muxer
      muxer = new Muxer({
        // Run anytime a remote stream is created
        onStream: async muxedStream => {
          if (!connection) return
          const mss = new Multistream.Listener(muxedStream)
          try {
            const { stream, protocol } = await mss.handle(Array.from(this.protocols.keys()))
            log('%s: incoming stream opened on %s', direction, protocol)
            if (this.metrics) this.metrics.trackStream({ stream, remotePeer, protocol })
            connection.addStream(muxedStream, { protocol })
            this._onStream({ connection, stream: { ...muxedStream, ...stream }, protocol })
          } catch (err) {
            log.error(err)
          }
        },
        // Run anytime a stream closes
        onStreamEnd: muxedStream => {
          connection.removeStream(muxedStream.id)
        }
      })

      newStream = async (protocols) => {
        log('%s: starting new stream on %s', direction, protocols)
        const muxedStream = muxer.newStream()
        const mss = new Multistream.Dialer(muxedStream)
        try {
          const { stream, protocol } = await mss.select(protocols)
          if (this.metrics) this.metrics.trackStream({ stream, remotePeer, protocol })
          return { stream: { ...muxedStream, ...stream }, protocol }
        } catch (err) {
          log.error('could not create new stream', err)
          throw errCode(err, codes.ERR_UNSUPPORTED_PROTOCOL)
        }
      }

      // Pipe all data through the muxer
      pipe(upgradedConn, muxer, upgradedConn).catch(log.error)
    }

    const _timeline = maConn.timeline
    maConn.timeline = new Proxy(_timeline, {
      set: (...args) => {
        if (connection && args[1] === 'close' && args[2] && !_timeline.close) {
          // Wait for close to finish before notifying of the closure
          (async () => {
            try {
              if (connection.stat.status === 'open') {
                await connection.close()
              }
            } catch (err) {
              log.error(err)
            } finally {
              this.onConnectionEnd(connection)
            }
          })()
        }

        return Reflect.set(...args)
      }
    })
    maConn.timeline.upgraded = Date.now()

    const errConnectionNotMultiplexed = () => {
      throw errCode(new Error('connection is not multiplexed'), 'ERR_CONNECTION_NOT_MULTIPLEXED')
    }

    // Create the connection
    connection = new Connection({
      localAddr: maConn.localAddr,
      remoteAddr: maConn.remoteAddr,
      localPeer: this.localPeer,
      remotePeer: remotePeer,
      stat: {
        direction,
        // @ts-ignore
        timeline: maConn.timeline,
        multiplexer: Muxer && Muxer.multicodec,
        encryption: cryptoProtocol
      },
      newStream: newStream || errConnectionNotMultiplexed,
      getStreams: () => muxer ? muxer.streams : errConnectionNotMultiplexed(),
      close: async () => {
        await maConn.close()
        // Ensure remaining streams are aborted
        if (muxer) {
          muxer.streams.map(stream => stream.abort())
        }
      }
    })

    this.onConnection(connection)

    return connection
  }

  /**
   * Routes incoming streams to the correct handler
   *
   * @private
   * @param {object} options
   * @param {Connection} options.connection - The connection the stream belongs to
   * @param {MuxedStream} options.stream
   * @param {string} options.protocol
   */
  _onStream ({ connection, stream, protocol }) {
    const handler = this.protocols.get(protocol)
    handler({ connection, stream, protocol })
  }

  /**
   * Attempts to encrypt the incoming `connection` with the provided `cryptos`.
   *
   * @private
   * @async
   * @param {PeerId} localPeer - The initiators PeerId
   * @param {*} connection
   * @param {Map<string, Crypto>} cryptos
   * @returns {Promise<CryptoResult>} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
   */
  async _encryptInbound (localPeer, connection, cryptos) {
    const mss = new Multistream.Listener(connection)
    const protocols = Array.from(cryptos.keys())
    log('handling inbound crypto protocol selection', protocols)

    try {
      const { stream, protocol } = await mss.handle(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting inbound connection...')

      if (!crypto) {
        throw new Error(`no crypto module found for ${protocol}`)
      }

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
   *
   * @private
   * @async
   * @param {PeerId} localPeer - The initiators PeerId
   * @param {MultiaddrConnection} connection
   * @param {PeerId} remotePeerId
   * @param {Map<string, Crypto>} cryptos
   * @returns {Promise<CryptoResult>} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
   */
  async _encryptOutbound (localPeer, connection, remotePeerId, cryptos) {
    const mss = new Multistream.Dialer(connection)
    const protocols = Array.from(cryptos.keys())
    log('selecting outbound crypto protocol', protocols)

    try {
      const { stream, protocol } = await mss.select(protocols)
      const crypto = cryptos.get(protocol)
      log('encrypting outbound connection to %j', remotePeerId)

      if (!crypto) {
        throw new Error(`no crypto module found for ${protocol}`)
      }

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
   *
   * @private
   * @async
   * @param {MultiaddrConnection} connection - A basic duplex connection to multiplex
   * @param {Map<string, MuxerFactory>} muxers - The muxers to attempt multiplexing with
   * @returns {Promise<{ stream: MuxedStream, Muxer?: MuxerFactory}>} A muxed connection
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
   *
   * @private
   * @async
   * @param {MultiaddrConnection} connection - A basic duplex connection to multiplex
   * @param {Map<string, MuxerFactory>} muxers - The muxers to attempt multiplexing with
   * @returns {Promise<{ stream: MuxedStream, Muxer?: MuxerFactory}>} A muxed connection
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

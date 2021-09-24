'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit'), {
  error: debug('libp2p:circuit:err')
})

const errCode = require('err-code')
const mafmt = require('mafmt')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const { CircuitRelay: CircuitPB } = require('./protocol')
const { codes } = require('../errors')

const toConnection = require('libp2p-utils/src/stream-to-ma-conn')

const { relay: multicodec } = require('./multicodec')
const createListener = require('./listener')
const { handleCanHop, handleHop, hop } = require('./circuit/hop')
const { handleStop } = require('./circuit/stop')
const StreamHandler = require('./circuit/stream-handler')

const transportSymbol = Symbol.for('@libp2p/js-libp2p-circuit/circuit')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */

class Circuit {
  /**
   * Creates an instance of the Circuit Transport.
   *
   * @class
   * @param {object} options
   * @param {import('../')} options.libp2p
   * @param {import('../upgrader')} options.upgrader
   */
  constructor ({ libp2p, upgrader }) {
    this._dialer = libp2p.dialer
    this._registrar = libp2p.registrar
    this._connectionManager = libp2p.connectionManager
    this._upgrader = upgrader
    this._options = libp2p._config.relay
    this._libp2p = libp2p
    this.peerId = libp2p.peerId

    this._registrar.handle(multicodec, this._onProtocol.bind(this))
  }

  /**
   * @param {Object} props
   * @param {Connection} props.connection
   * @param {MuxedStream} props.stream
   */
  async _onProtocol ({ connection, stream }) {
    /** @type {import('./circuit/stream-handler')} */
    const streamHandler = new StreamHandler({ stream })
    const request = await streamHandler.read()

    if (!request) {
      return
    }

    const circuit = this
    let virtualConnection

    switch (request.type) {
      case CircuitPB.Type.CAN_HOP: {
        log('received CAN_HOP request from %s', connection.remotePeer.toB58String())
        await handleCanHop({ circuit, connection, streamHandler })
        break
      }
      case CircuitPB.Type.HOP: {
        log('received HOP request from %s', connection.remotePeer.toB58String())
        virtualConnection = await handleHop({
          connection,
          request,
          streamHandler,
          circuit
        })
        break
      }
      case CircuitPB.Type.STOP: {
        log('received STOP request from %s', connection.remotePeer.toB58String())
        virtualConnection = await handleStop({
          connection,
          request,
          streamHandler
        })
        break
      }
      default: {
        log('Request of type %s not supported', request.type)
      }
    }

    if (virtualConnection) {
      // @ts-ignore dst peer will not be undefined
      const remoteAddr = new Multiaddr(request.dstPeer.addrs[0])
      // @ts-ignore src peer will not be undefined
      const localAddr = new Multiaddr(request.srcPeer.addrs[0])
      const maConn = toConnection({
        stream: virtualConnection,
        remoteAddr,
        localAddr
      })
      const type = request.type === CircuitPB.Type.HOP ? 'relay' : 'inbound'
      log('new %s connection %s', type, maConn.remoteAddr)

      const conn = await this._upgrader.upgradeInbound(maConn)
      log('%s connection %s upgraded', type, maConn.remoteAddr)
      this.handler && this.handler(conn)
    }
  }

  /**
   * Dial a peer over a relay
   *
   * @param {Multiaddr} ma - the multiaddr of the peer to dial
   * @param {Object} options - dial options
   * @param {AbortSignal} [options.signal] - An optional abort signal
   * @returns {Promise<Connection>} - the connection
   */
  async dial (ma, options) {
    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = new Multiaddr(addrs[0])
    const destinationAddr = new Multiaddr(addrs[addrs.length - 1])
    const relayId = relayAddr.getPeerId()
    const destinationId = destinationAddr.getPeerId()

    if (!relayId || !destinationId) {
      const errMsg = 'Circuit relay dial failed as addresses did not have peer id'
      log.error(errMsg)
      throw errCode(new Error(errMsg), codes.ERR_RELAYED_DIAL)
    }

    const relayPeer = PeerId.createFromB58String(relayId)
    const destinationPeer = PeerId.createFromB58String(destinationId)

    let disconnectOnFailure = false
    let relayConnection = this._connectionManager.get(relayPeer)
    if (!relayConnection) {
      relayConnection = await this._dialer.connectToPeer(relayAddr, options)
      disconnectOnFailure = true
    }

    try {
      const virtualConnection = await hop({
        connection: relayConnection,
        request: {
          type: CircuitPB.Type.HOP,
          srcPeer: {
            id: this.peerId.toBytes(),
            addrs: this._libp2p.multiaddrs.map(addr => addr.bytes)
          },
          dstPeer: {
            id: destinationPeer.toBytes(),
            addrs: [new Multiaddr(destinationAddr).bytes]
          }
        }
      })

      const localAddr = relayAddr.encapsulate(`/p2p-circuit/p2p/${this.peerId.toB58String()}`)
      const maConn = toConnection({
        stream: virtualConnection,
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)

      return this._upgrader.upgradeOutbound(maConn)
    } catch (err) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await relayConnection.close()
      throw err
    }
  }

  /**
   * Create a listener
   *
   * @param {any} options
   * @param {Function} handler
   * @returns {import('libp2p-interfaces/src/transport/types').Listener}
   */
  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    // Called on successful HOP and STOP requests
    this.handler = handler

    return createListener(this._libp2p)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial on
   *
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]}
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return mafmt.Circuit.matches(ma)
    })
  }

  get [Symbol.toStringTag] () {
    return 'Circuit'
  }

  /**
   * Checks if the given value is a Transport instance.
   *
   * @param {any} other
   * @returns {other is Transport}
   */
  static isTransport (other) {
    return Boolean(other && other[transportSymbol])
  }
}

module.exports = Circuit

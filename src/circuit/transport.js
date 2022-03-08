'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit'), {
  error: debug('libp2p:circuit:err')
})

const errCode = require('err-code')
const mafmt = require('mafmt')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const { CircuitRelay: CircuitPB } = require('./v1/protocol')
const { codes } = require('../errors')

const toConnection = require('libp2p-utils/src/stream-to-ma-conn')

const { relayV1: protocolIDv1, protocolIDv2Hop, protocolIDv2Stop } = require('./multicodec')
const createListener = require('./listener')
const { handleCanHop, handleHop, hop } = require('./v1/hop')
const { handleStop: handleStopV1 } = require('./v1/stop')
const StreamHandler = require('./v1/stream-handler')
const StreamHandlerV2 = require('./v2/stream-handler')
const { handleHopProtocol } = require('./v2/hop')
const { handleStop: handleStopV2 } = require('./v2/stop')
const { Status, HopMessage, StopMessage } = require('./v2/protocol')
const createError = require('err-code')

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

    this._registrar.handle(protocolIDv1, this._onV1Protocol.bind(this))
    this._registrar.handle(protocolIDv2Hop, this._onV2ProtocolHop.bind(this))
    this._registrar.handle(protocolIDv2Stop, this._onV2ProtocolStop.bind(this))
  }

  /**
   * @param {Object} props
   * @param {Connection} props.connection
   * @param {MuxedStream} props.stream
   */
  async _onV1Protocol ({ connection, stream }) {
    /** @type {import('./v1/stream-handler')} */
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
        virtualConnection = await handleStopV1({
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
   * As a relay it handles hop connect and reserve request
   *
   * @param {Object} props
   * @param {Connection} props.connection
   * @param {MuxedStream} props.stream
   */
  async _onV2ProtocolHop ({ connection, stream }) {
    log('received circuit v2 hop protocol stream from %s', connection.remotePeer.toB58String())
    const streamHandler = new StreamHandlerV2({ stream })
    const request = HopMessage.decode(await streamHandler.read())

    if (!request) {
      return
    }

    await handleHopProtocol({
      connection,
      streamHandler,
      circuit: this,
      relayPeer: this._libp2p.peerId,
      relayAddrs: this._libp2p.multiaddrs,
      // TODO: replace with real reservation store
      reservationStore: {
        reserve: async function () { return { status: Status.OK, expire: (new Date().getTime() / 1000 + 21600) } },
        hasReservation: async function () { return true },
        removeReservation: async function () { }
      },
      request,
      limit: null,
      acl: null
    })
  }

  /**
   * As a client this is used to
   *
   * @param {Object} props
   * @param {Connection} props.connection
   * @param {MuxedStream} props.stream
   */
  async _onV2ProtocolStop ({ connection, stream }) {
    const streamHandler = new StreamHandlerV2({ stream })
    const request = StopMessage.decode(await streamHandler.read())
    log('received circuit v2 stop protocol request from %s', connection.remotePeer.toB58String())
    if (!request) {
      return
    }

    const mStream = await handleStopV2({
      connection,
      streamHandler,
      request
    })

    if (mStream) {
      // @ts-ignore dst peer will not be undefined
      const remoteAddr = new Multiaddr(request.peer.addrs[0])
      const localAddr = this._libp2p.transportManager.getAddrs()[0]
      const maConn = toConnection({
        stream: mStream,
        remoteAddr,
        localAddr
      })
      log('new inbound connection %s', maConn.remoteAddr)
      const conn = await this._upgrader.upgradeInbound(maConn)
      log('%s connection %s upgraded', 'inbound', maConn.remoteAddr)
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

    const stream = await relayConnection.newStream([protocolIDv2Hop, protocolIDv1])

    switch (stream.protocol) {
      case protocolIDv1: return await this.connectV1({
        stream: stream.stream,
        connection: relayConnection,
        destinationPeer,
        destinationAddr,
        relayAddr,
        ma,
        disconnectOnFailure
      })
      case protocolIDv2Hop: return await this.connectV2({
        stream: stream.stream,
        connection: relayConnection,
        destinationPeer,
        destinationAddr,
        relayAddr,
        ma,
        disconnectOnFailure
      })
      default:
        stream.stream.reset()
        throw new Error('Unexpected stream protocol')
    }
  }

  /**
   *
   * @param {Object} params
   * @param {MuxedStream} params.stream
   * @param {Connection} params.connection
   * @param {PeerId} params.destinationPeer
   * @param {Multiaddr} params.destinationAddr
   * @param {Multiaddr} params.relayAddr
   * @param {Multiaddr} params.ma
   * @param {boolean} params.disconnectOnFailure
   * @returns {Promise<Connection>}
   */
  async connectV1 ({ stream, connection, destinationPeer, destinationAddr, relayAddr, ma, disconnectOnFailure }) {
    try {
      const virtualConnection = await hop({
        stream,
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
    } catch (/** @type {any} */ err) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await connection.close()
      throw err
    }
  }

  /**
   *
   * @param {Object} params
   * @param {MuxedStream} params.stream
   * @param {Connection} params.connection
   * @param {PeerId} params.destinationPeer
   * @param {Multiaddr} params.destinationAddr
   * @param {Multiaddr} params.relayAddr
   * @param {Multiaddr} params.ma
   * @param {boolean} params.disconnectOnFailure
   * @returns {Promise<Connection>}
   */
  async connectV2 ({ stream, connection, destinationPeer, destinationAddr, relayAddr, ma, disconnectOnFailure }) {
    try {
      const streamHandler = new StreamHandlerV2({ stream })
      streamHandler.write(HopMessage.encode({
        type: HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [new Multiaddr(destinationAddr).bytes]
        }
      }).finish())

      const status = HopMessage.decode(await streamHandler.read())
      if (status.status !== Status.OK) {
        throw createError(new Error('failed to connect via realy with status ' + status.status), codes.ERR_HOP_REQUEST_FAILED)
      }

      // TODO: do something with limit and transient connection

      let localAddr = relayAddr
      localAddr = localAddr.encapsulate(`/p2p-circuit/p2p/${this.peerId.toB58String()}`)
      const maConn = toConnection({
        stream: streamHandler.rest(),
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)
      const conn = await this._upgrader.upgradeOutbound(maConn)
      return conn
    } catch (/** @type {any} */ err) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await connection.close()
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

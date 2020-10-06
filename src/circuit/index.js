'use strict'

const mafmt = require('mafmt')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const withIs = require('class-is')
const { CircuitRelay: CircuitPB } = require('./protocol')

const debug = require('debug')
const log = debug('libp2p:circuit')
log.error = debug('libp2p:circuit:error')
const toConnection = require('libp2p-utils/src/stream-to-ma-conn')

const { relay: multicodec } = require('./multicodec')
const createListener = require('./listener')
const { handleCanHop, handleHop, hop } = require('./circuit/hop')
const { handleStop } = require('./circuit/stop')
const StreamHandler = require('./circuit/stream-handler')

class Circuit {
  /**
   * Creates an instance of Circuit.
   *
   * @class
   * @param {object} options
   * @param {Libp2p} options.libp2p
   * @param {Upgrader} options.upgrader
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

  async _onProtocol ({ connection, stream, protocol }) {
    const streamHandler = new StreamHandler({ stream })
    const request = await streamHandler.read()
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
          streamHandler,
          circuit
        })
        break
      }
      default: {
        log('Request of type %s not supported', request.type)
      }
    }

    if (virtualConnection) {
      const remoteAddr = multiaddr(request.dstPeer.addrs[0])
      const localAddr = multiaddr(request.srcPeer.addrs[0])
      const maConn = toConnection({
        stream: virtualConnection,
        remoteAddr,
        localAddr
      })
      const type = CircuitPB.Type === CircuitPB.Type.HOP ? 'relay' : 'inbound'
      log('new %s connection %s', type, maConn.remoteAddr)

      const conn = await this._upgrader.upgradeInbound(maConn)
      log('%s connection %s upgraded', type, maConn.remoteAddr)
      this.handler && this.handler(conn)
    }
  }

  /**
   * Dial a peer over a relay
   *
   * @param {multiaddr} ma - the multiaddr of the peer to dial
   * @param {Object} options - dial options
   * @param {AbortSignal} [options.signal] - An optional abort signal
   * @returns {Connection} - the connection
   */
  async dial (ma, options) {
    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = multiaddr(addrs[0])
    const destinationAddr = multiaddr(addrs[addrs.length - 1])
    const relayPeer = PeerId.createFromCID(relayAddr.getPeerId())
    const destinationPeer = PeerId.createFromCID(destinationAddr.getPeerId())

    let disconnectOnFailure = false
    let relayConnection = this._connectionManager.get(relayPeer)
    if (!relayConnection) {
      relayConnection = await this._dialer.connectToPeer(relayAddr, options)
      disconnectOnFailure = true
    }

    try {
      const virtualConnection = await hop({
        connection: relayConnection,
        circuit: this,
        request: {
          type: CircuitPB.Type.HOP,
          srcPeer: {
            id: this.peerId.toBytes(),
            addrs: this._libp2p.multiaddrs.map(addr => addr.bytes)
          },
          dstPeer: {
            id: destinationPeer.toBytes(),
            addrs: [multiaddr(destinationAddr).bytes]
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
   * @returns {listener}
   */
  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    // Called on successful HOP and STOP requests
    this.handler = handler

    return createListener(this, options)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial on
   *
   * @param {Array<Multiaddr>} multiaddrs
   * @returns {Array<Multiaddr>}
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return mafmt.Circuit.matches(ma)
    })
  }
}

/**
 * @type {Circuit}
 */
module.exports = withIs(Circuit, { className: 'Circuit', symbolName: '@libp2p/js-libp2p-circuit/circuit' })

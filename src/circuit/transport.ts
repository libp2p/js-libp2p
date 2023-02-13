import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import { CircuitRelay as CircuitPB } from './pb/index.js'
import { codes } from '../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { RELAY_CODEC } from './multicodec.js'
import { createListener } from './listener.js'
import { handleCanHop, handleHop, hop } from './circuit/hop.js'
import { handleStop } from './circuit/stop.js'
import { StreamHandler } from './circuit/stream-handler.js'
import { symbol, Upgrader } from '@libp2p/interface-transport'
import { peerIdFromString } from '@libp2p/peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Listener, Transport, CreateListenerOptions, ConnectionHandler } from '@libp2p/interface-transport'
import type { Connection } from '@libp2p/interface-connection'
import type { RelayConfig } from './index.js'
import { abortableDuplex } from 'abortable-iterator'
import { TimeoutController } from 'timeout-abort-controller'
import { setMaxListeners } from 'events'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Duplex } from 'it-stream-types'
import type { Startable } from '@libp2p/interfaces/startable'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { AddressManager } from '@libp2p/interface-address-manager'

const log = logger('libp2p:circuit')

export interface CircuitComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  upgrader: Upgrader
  addressManager: AddressManager
}

export class Circuit implements Transport, Startable {
  private handler?: ConnectionHandler
  private readonly components: CircuitComponents
  private readonly _init: RelayConfig
  private _started: boolean

  constructor (components: CircuitComponents, init: RelayConfig) {
    this._init = init
    this.components = components
    this._started = false
  }

  isStarted () {
    return this._started
  }

  async start (): Promise<void> {
    if (this._started) {
      return
    }

    this._started = true

    await this.components.registrar.handle(RELAY_CODEC, (data) => {
      void this._onProtocol(data).catch(err => {
        log.error(err)
      })
    }, { ...this._init })
      .catch(err => {
        log.error(err)
      })
  }

  async stop () {
    await this.components.registrar.unhandle(RELAY_CODEC)
  }

  hopEnabled () {
    return true
  }

  hopActive () {
    return true
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return 'libp2p/circuit-relay-v1'
  }

  async _onProtocol (data: IncomingStreamData) {
    const { connection, stream } = data
    const controller = new TimeoutController(this._init.hop.timeout)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, controller.signal)
    } catch {}

    try {
      const source = abortableDuplex(stream, controller.signal)
      const streamHandler = new StreamHandler({
        stream: {
          ...stream,
          ...source
        }
      })
      const request = await streamHandler.read()

      if (request == null) {
        log('request was invalid, could not read from stream')
        streamHandler.write({
          type: CircuitPB.Type.STATUS,
          code: CircuitPB.Status.MALFORMED_MESSAGE
        })
        streamHandler.close()
        return
      }

      let virtualConnection: Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> | undefined

      switch (request.type) {
        case CircuitPB.Type.CAN_HOP: {
          log('received CAN_HOP request from %p', connection.remotePeer)
          await handleCanHop({ circuit: this, connection, streamHandler })
          break
        }
        case CircuitPB.Type.HOP: {
          log('received HOP request from %p', connection.remotePeer)
          await handleHop({
            connection,
            request,
            streamHandler,
            circuit: this,
            connectionManager: this.components.connectionManager
          })
          break
        }
        case CircuitPB.Type.STOP: {
          log('received STOP request from %p', connection.remotePeer)
          virtualConnection = await handleStop({
            connection,
            request,
            streamHandler
          })
          break
        }
        default: {
          log('Request of type %s not supported', request.type)
          streamHandler.write({
            type: CircuitPB.Type.STATUS,
            code: CircuitPB.Status.MALFORMED_MESSAGE
          })
          streamHandler.close()
          return
        }
      }

      if (virtualConnection != null) {
        const remoteAddr = connection.remoteAddr
          .encapsulate('/p2p-circuit')
          .encapsulate(multiaddr(request.dstPeer?.addrs[0]))
        const localAddr = multiaddr(request.srcPeer?.addrs[0])
        const maConn = streamToMaConnection({
          stream: virtualConnection,
          remoteAddr,
          localAddr
        })
        const type = request.type === CircuitPB.Type.HOP ? 'relay' : 'inbound'
        log('new %s connection %s', type, maConn.remoteAddr)

        const conn = await this.components.upgrader.upgradeInbound(maConn)
        log('%s connection %s upgraded', type, maConn.remoteAddr)

        if (this.handler != null) {
          this.handler(conn)
        }
      }
    } finally {
      controller.clear()
    }
  }

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = multiaddr(addrs[0])
    const destinationAddr = multiaddr(addrs[addrs.length - 1])
    const relayId = relayAddr.getPeerId()
    const destinationId = destinationAddr.getPeerId()

    if (relayId == null || destinationId == null) {
      const errMsg = 'Circuit relay dial failed as addresses did not have peer id'
      log.error(errMsg)
      throw errCode(new Error(errMsg), codes.ERR_RELAYED_DIAL)
    }

    const relayPeer = peerIdFromString(relayId)
    const destinationPeer = peerIdFromString(destinationId)

    let disconnectOnFailure = false
    const relayConnections = this.components.connectionManager.getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.components.peerStore.addressBook.add(relayPeer, [relayAddr])
      relayConnection = await this.components.connectionManager.openConnection(relayPeer, options)
      disconnectOnFailure = true
    }

    try {
      const virtualConnection = await hop({
        ...options,
        connection: relayConnection,
        request: {
          type: CircuitPB.Type.HOP,
          srcPeer: {
            id: this.components.peerId.toBytes(),
            addrs: this.components.addressManager.getAddresses().map(addr => addr.bytes)
          },
          dstPeer: {
            id: destinationPeer.toBytes(),
            addrs: [multiaddr(destinationAddr).bytes]
          }
        }
      })

      const localAddr = relayAddr.encapsulate(`/p2p-circuit/p2p/${this.components.peerId.toString()}`)
      const maConn = streamToMaConnection({
        stream: virtualConnection,
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)

      return await this.components.upgrader.upgradeOutbound(maConn)
    } catch (err: any) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await relayConnection.close()
      throw err
    }
  }

  /**
   * Create a listener
   */
  createListener (options: CreateListenerOptions): Listener {
    // Called on successful HOP and STOP requests
    this.handler = options.handler

    return createListener({
      connectionManager: this.components.connectionManager,
      peerStore: this.components.peerStore
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial on
   *
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]}
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return mafmt.Circuit.matches(ma)
    })
  }
}

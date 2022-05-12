import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import { Multiaddr } from '@multiformats/multiaddr'
import { CircuitRelay as CircuitPB } from './pb/index.js'
import { codes } from '../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { RELAY_CODEC } from './multicodec.js'
import { createListener } from './listener.js'
import { handleCanHop, handleHop, hop } from './circuit/hop.js'
import { handleStop } from './circuit/stop.js'
import { StreamHandler } from './circuit/stream-handler.js'
import { symbol } from '@libp2p/interfaces/transport'
import { peerIdFromString } from '@libp2p/peer-id'
import { Components, Initializable } from '@libp2p/interfaces/components'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { Listener, Transport, CreateListenerOptions, ConnectionHandler } from '@libp2p/interfaces/transport'
import type { Connection } from '@libp2p/interfaces/connection'

const log = logger('libp2p:circuit')

export class Circuit implements Transport, Initializable {
  private handler?: ConnectionHandler
  private components: Components = new Components()

  init (components: Components): void {
    this.components = components
    void this.components.getRegistrar().handle(RELAY_CODEC, (data) => {
      void this._onProtocol(data).catch(err => {
        log.error(err)
      })
    })
      .catch(err => {
        log.error(err)
      })
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
    const streamHandler = new StreamHandler({ stream })
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

    let virtualConnection

    switch (request.type) {
      case CircuitPB.Type.CAN_HOP: {
        log('received CAN_HOP request from %p', connection.remotePeer)
        await handleCanHop({ circuit: this, connection, streamHandler })
        break
      }
      case CircuitPB.Type.HOP: {
        log('received HOP request from %p', connection.remotePeer)
        virtualConnection = await handleHop({
          connection,
          request,
          streamHandler,
          circuit: this,
          connectionManager: this.components.getConnectionManager()
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
      // @ts-expect-error dst peer will not be undefined
      const remoteAddr = new Multiaddr(request.dstPeer.addrs[0])
      // @ts-expect-error dst peer will not be undefined
      const localAddr = new Multiaddr(request.srcPeer.addrs[0])
      const maConn = streamToMaConnection({
        stream: virtualConnection,
        remoteAddr,
        localAddr
      })
      const type = request.type === CircuitPB.Type.HOP ? 'relay' : 'inbound'
      log('new %s connection %s', type, maConn.remoteAddr)

      const conn = await this.components.getUpgrader().upgradeInbound(maConn)
      log('%s connection %s upgraded', type, maConn.remoteAddr)

      if (this.handler != null) {
        this.handler(conn)
      }
    }
  }

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = new Multiaddr(addrs[0])
    const destinationAddr = new Multiaddr(addrs[addrs.length - 1])
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
    const relayConnections = this.components.getConnectionManager().getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.components.getPeerStore().addressBook.add(relayPeer, [relayAddr])
      relayConnection = await this.components.getConnectionManager().openConnection(relayPeer, options)
      disconnectOnFailure = true
    }

    try {
      const virtualConnection = await hop({
        connection: relayConnection,
        request: {
          type: CircuitPB.Type.HOP,
          srcPeer: {
            id: this.components.getPeerId().toBytes(),
            addrs: this.components.getAddressManager().getAddresses().map(addr => addr.bytes)
          },
          dstPeer: {
            id: destinationPeer.toBytes(),
            addrs: [new Multiaddr(destinationAddr).bytes]
          }
        }
      })

      const localAddr = relayAddr.encapsulate(`/p2p-circuit/p2p/${this.components.getPeerId().toString()}`)
      const maConn = streamToMaConnection({
        stream: virtualConnection,
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)

      return await this.components.getUpgrader().upgradeOutbound(maConn)
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
      connectionManager: this.components.getConnectionManager(),
      peerStore: this.components.getPeerStore()
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

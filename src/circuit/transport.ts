import * as CircuitV1 from './v1/pb/index.js'
import * as CircuitV2 from './v2/pb/index.js'
import { ReservationStore } from './v2/reservation-store.js'
import { logger } from '@libp2p/logger'
import createError from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import { Multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { protocolIDv2Hop, RELAY_V1_CODEC } from './multicodec.js'
import { createListener } from './listener.js'
import { symbol } from '@libp2p/interfaces/transport'
import { peerIdFromString } from '@libp2p/peer-id'
import { Components, Initializable } from '@libp2p/interfaces/components'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { Listener, Transport, CreateListenerOptions, ConnectionHandler } from '@libp2p/interfaces/transport'
import type { Connection, Stream } from '@libp2p/interfaces/connection'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { StreamHandlerV2 } from './v2/stream-handler.js'
import { StreamHandlerV1 } from './v1/stream-handler.js'
import * as CircuitV1Handler from './v1/index.js'
import * as CircuitV2Handler from './v2/index.js'

const log = logger('libp2p:circuit')

export interface CircuitOptions {
  limit?: number
}

interface ConnectOptions {
  stream: Stream
  connection: Connection
  destinationPeer: PeerId
  destinationAddr: Multiaddr
  relayAddr: Multiaddr
  ma: Multiaddr
  disconnectOnFailure: boolean
}
export class Circuit implements Transport, Initializable {
  private handler?: ConnectionHandler
  private components: Components = new Components()
  private readonly reservationStore: ReservationStore

  constructor (options: CircuitOptions) {
    this.reservationStore = new ReservationStore(options.limit)
  }

  init (components: Components): void {
    this.components = components

    void this.components.getRegistrar().handle(RELAY_V1_CODEC, (data) => {
      void this._onProtocolV1(data).catch(err => {
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

  getPeerConnection (dstPeer: PeerId): Connection|undefined {
    return this.components.getConnectionManager().getConnections(dstPeer)[0] ?? undefined
  }

  async _onProtocolV1 (data: IncomingStreamData) {
    const { connection, stream } = data
    const streamHandler = new StreamHandlerV1({ stream })
    const request = await streamHandler.read()

    if (request == null) {
      log('request was invalid, could not read from stream')
      streamHandler.write({
        type: CircuitV1.CircuitRelay.Type.STATUS,
        code: CircuitV1.CircuitRelay.Status.MALFORMED_MESSAGE
      })
      streamHandler.close()
      return
    }

    let virtualConnection

    switch (request.type) {
      case CircuitV1.CircuitRelay.Type.CAN_HOP: {
        log('received CAN_HOP request from %p', connection.remotePeer)
        await CircuitV1Handler.handleCanHop({ circuit: this, connection, streamHandler })
        break
      }
      case CircuitV1.CircuitRelay.Type.HOP: {
        log('received HOP request from %p', connection.remotePeer)
        virtualConnection = await CircuitV1Handler.handleHop({
          connection,
          request,
          streamHandler,
          circuit: this,
          connectionManager: this.components.getConnectionManager()
        })
        break
      }
      case CircuitV1.CircuitRelay.Type.STOP: {
        log('received STOP request from %p', connection.remotePeer)
        virtualConnection = await CircuitV1Handler.handleStop({
          connection,
          request,
          streamHandler
        })
        break
      }
      default: {
        log('Request of type %s not supported', request.type)
        streamHandler.write({
          type: CircuitV1.CircuitRelay.Type.STATUS,
          code: CircuitV1.CircuitRelay.Status.MALFORMED_MESSAGE
        })
        streamHandler.close()
        return
      }
    }

    if (virtualConnection != null) {
      const remoteAddr = new Multiaddr(request.dstPeer?.addrs?.[0] ?? '')
      const localAddr = new Multiaddr(request.srcPeer?.addrs?.[0] ?? '')
      const maConn = streamToMaConnection({
        stream: virtualConnection,
        remoteAddr,
        localAddr
      })
      const type = request.type === CircuitV1.CircuitRelay.Type.HOP ? 'relay' : 'inbound'
      log('new %s connection %s', type, maConn.remoteAddr)

      const conn = await this.components.getUpgrader().upgradeInbound(maConn)
      log('%s connection %s upgraded', type, maConn.remoteAddr)

      if (this.handler != null) {
        this.handler(conn)
      }
    }
  }

  async _onV2ProtocolHop ({ connection, stream }: IncomingStreamData) {
    log('received circuit v2 hop protocol stream from %s', connection.remotePeer)
    const streamHandler = new StreamHandlerV2({ stream })
    const request = CircuitV2.HopMessage.decode(await streamHandler.read())

    if (request?.type === undefined) {
      return
    }

    await CircuitV2Handler.handleHopProtocol({
      connection,
      streamHandler,
      circuit: this,
      relayPeer: this.components.getPeerId(),
      relayAddrs: this.components.getAddressManager().getListenAddrs(),
      reservationStore: this.reservationStore,
      request
    })
  }

  async _onV2ProtocolStop ({ connection, stream }: IncomingStreamData) {
    const streamHandler = new StreamHandlerV2({ stream })
    const request = CircuitV2.StopMessage.decode(await streamHandler.read())
    log('received circuit v2 stop protocol request from %s', connection.remotePeer)
    if (request?.type === undefined) {
      return
    }

    const mStream = await CircuitV2Handler.handleStop({
      connection,
      streamHandler,
      request
    })

    if (mStream !== null && mStream !== undefined) {
      const remoteAddr = new Multiaddr(request.peer?.addrs?.[0])
      const localAddr = this.components.getTransportManager().getAddrs()[0]
      const maConn = streamToMaConnection({
        stream: mStream,
        remoteAddr,
        localAddr
      })
      log('new inbound connection %s', maConn.remoteAddr)
      const conn = await this.components.getUpgrader().upgradeInbound(maConn)
      log('%s connection %s upgraded', 'inbound', maConn.remoteAddr)
      this.handler?.(conn)
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
      throw createError(new Error(errMsg), codes.ERR_RELAYED_DIAL)
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
      const stream = await relayConnection.newStream([protocolIDv2Hop, RELAY_V1_CODEC])

      switch (stream.protocol) {
        case RELAY_V1_CODEC: return await this.connectV1({
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
    } catch (err: any) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await relayConnection.close()
      throw err
    }
  }

  async connectV1 ({
    stream, connection, destinationPeer,
    destinationAddr, relayAddr, ma,
    disconnectOnFailure
  }: ConnectOptions
  ) {
    const virtualConnection = await CircuitV1Handler.hop({
      stream,
      request: {
        type: CircuitV1.CircuitRelay.Type.HOP,
        srcPeer: {
          id: this.components.getPeerId().toBytes(),
          addrs: this.components.getAddressManager().getListenAddrs().map(addr => addr.bytes)
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
  }

  async connectV2 (
    {
      stream, connection, destinationPeer,
      destinationAddr, relayAddr, ma,
      disconnectOnFailure
    }: ConnectOptions
  ) {
    try {
      const streamHandler = new StreamHandlerV2({ stream })
      streamHandler.write(CircuitV2.HopMessage.encode({
        type: CircuitV2.HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [new Multiaddr(destinationAddr).bytes]
        }
      }))

      const status = CircuitV2.HopMessage.decode(await streamHandler.read())
      if (status.status !== CircuitV2.Status.OK) {
        throw createError(new Error(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`), codes.ERR_HOP_REQUEST_FAILED)
      }

      // TODO: do something with limit and transient connection

      let localAddr = relayAddr
      localAddr = localAddr.encapsulate(`/p2p-circuit/p2p/${this.components.getPeerId().toString()}`)
      const maConn = streamToMaConnection({
        stream: streamHandler.rest(),
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)
      const conn = await this.components.getUpgrader().upgradeOutbound(maConn)
      return conn
    } catch (/** @type {any} */ err) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await connection.close()
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

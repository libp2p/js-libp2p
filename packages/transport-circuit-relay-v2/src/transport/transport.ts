import { DialError, InvalidMessageError, serviceCapabilities, serviceDependencies, start, stop, transportSymbol } from '@libp2p/interface'
import { peerFilter } from '@libp2p/peer-collections'
import { peerIdFromMultihash, peerIdFromString } from '@libp2p/peer-id'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { multiaddr } from '@multiformats/multiaddr'
import { Circuit } from '@multiformats/multiaddr-matcher'
import { pbStream } from 'it-protobuf-stream'
import { setMaxListeners } from 'main-event'
import * as Digest from 'multiformats/hashes/digest'
import { CustomProgressEvent } from 'progress-events'
import { CIRCUIT_PROTO_CODE, DEFAULT_DISCOVERY_FILTER_ERROR_RATE, DEFAULT_DISCOVERY_FILTER_SIZE, MAX_CONNECTIONS, RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC } from '../constants.js'
import { StopMessage, HopMessage, Status } from '../pb/index.js'
import { CircuitListen, CircuitSearch, LimitTracker } from '../utils.js'
import { RelayDiscovery } from './discovery.js'
import { createListener } from './listener.js'
import { ReservationStore } from './reservation-store.js'
import type { CircuitRelayTransportComponents, CircuitRelayTransportInit } from './index.js'
import type { Transport, CreateListenerOptions, Listener, Upgrader, ComponentLogger, Logger, Connection, Stream, ConnectionGater, PeerId, PeerStore, OutboundConnectionUpgradeEvents, DialTransportOptions, OpenConnectionProgressEvents, IncomingStreamData } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressEvent } from 'progress-events'

const isValidStop = (request: StopMessage): request is Required<StopMessage> => {
  if (request.peer == null) {
    return false
  }

  try {
    request.peer.addrs.forEach(multiaddr)
  } catch {
    return false
  }

  return true
}

const defaults = {
  maxInboundStopStreams: MAX_CONNECTIONS,
  maxOutboundStopStreams: MAX_CONNECTIONS,
  stopTimeout: 30000
}

export type CircuitRelayDialEvents =
  OutboundConnectionUpgradeEvents |
  OpenConnectionProgressEvents |
  ProgressEvent<'circuit-relay:open-connection'> |
  ProgressEvent<'circuit-relay:reuse-connection'> |
  ProgressEvent<'circuit-relay:open-hop-stream'> |
  ProgressEvent<'circuit-relay:write-connect-message'> |
  ProgressEvent<'circuit-relay:read-connect-response'>

export class CircuitRelayTransport implements Transport<CircuitRelayDialEvents> {
  private readonly discovery?: RelayDiscovery
  private readonly registrar: Registrar
  private readonly peerStore: PeerStore
  private readonly connectionManager: ConnectionManager
  private readonly transportManager: TransportManager
  private readonly peerId: PeerId
  private readonly upgrader: Upgrader
  private readonly addressManager: AddressManager
  private readonly connectionGater: ConnectionGater
  public readonly reservationStore: ReservationStore
  private readonly logger: ComponentLogger
  private readonly maxInboundStopStreams: number
  private readonly maxOutboundStopStreams?: number
  private started: boolean
  private readonly log: Logger
  private shutdownController: AbortController

  constructor (components: CircuitRelayTransportComponents, init: CircuitRelayTransportInit = {}) {
    this.log = components.logger.forComponent('libp2p:circuit-relay:transport')
    this.registrar = components.registrar
    this.peerStore = components.peerStore
    this.connectionManager = components.connectionManager
    this.transportManager = components.transportManager
    this.logger = components.logger
    this.peerId = components.peerId
    this.upgrader = components.upgrader
    this.addressManager = components.addressManager
    this.connectionGater = components.connectionGater
    this.maxInboundStopStreams = init.maxInboundStopStreams ?? defaults.maxInboundStopStreams
    this.maxOutboundStopStreams = init.maxOutboundStopStreams ?? defaults.maxOutboundStopStreams
    this.shutdownController = new AbortController()

    this.discovery = new RelayDiscovery(components, {
      filter: init.discoveryFilter ?? peerFilter(DEFAULT_DISCOVERY_FILTER_SIZE, DEFAULT_DISCOVERY_FILTER_ERROR_RATE)
    })
    this.discovery.addEventListener('relay:discover', (evt) => {
      this.reservationStore.addRelay(evt.detail, 'discovered')
        .catch(err => {
          if (err.name !== 'HadEnoughRelaysError' && err.name !== 'RelayQueueFullError') {
            this.log.error('could not add discovered relay %p', evt.detail, err)
          }
        })
    })
    this.reservationStore = new ReservationStore(components, init)
    this.reservationStore.addEventListener('relay:not-enough-relays', () => {
      this.discovery?.startDiscovery()
    })
    this.reservationStore.addEventListener('relay:found-enough-relays', () => {
      this.discovery?.stopDiscovery()
    })

    this.started = false
  }

  readonly [Symbol.toStringTag] = '@libp2p/circuit-relay-v2-transport'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport',
    '@libp2p/circuit-relay-v2-transport'
  ]

  get [serviceDependencies] (): string[] {
    // we only need identify if discovery is enabled
    if (this.discovery != null) {
      return [
        '@libp2p/identify'
      ]
    }

    return []
  }

  readonly [transportSymbol] = true

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

    await this.registrar.handle(RELAY_V2_STOP_CODEC, (data) => {
      const signal = this.upgrader.createInboundAbortSignal(this.shutdownController.signal)

      void this.onStop(data, signal)
        .catch(err => {
          this.log.error('error while handling STOP protocol', err)
          data.stream.abort(err)
        })
        .finally(() => {
          signal.clear()
        })
    }, {
      maxInboundStreams: this.maxInboundStopStreams,
      maxOutboundStreams: this.maxOutboundStopStreams,
      runOnLimitedConnection: true
    })

    await start(this.discovery, this.reservationStore)

    this.started = true
  }

  async stop (): Promise<void> {
    this.shutdownController.abort()
    await stop(this.discovery, this.reservationStore)
    await this.registrar.unhandle(RELAY_V2_STOP_CODEC)

    this.started = false
  }

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: DialTransportOptions<CircuitRelayDialEvents>): Promise<Connection> {
    if (ma.protoCodes().filter(code => code === CIRCUIT_PROTO_CODE).length !== 1) {
      const errMsg = 'Invalid circuit relay address'
      this.log.error(errMsg, ma)
      throw new DialError(errMsg)
    }

    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = multiaddr(addrs[0])
    const destinationAddr = multiaddr(addrs[addrs.length - 1])
    const relayId = relayAddr.getPeerId()
    const destinationId = destinationAddr.getPeerId()

    if (relayId == null || destinationId == null) {
      const errMsg = `ircuit relay dial to ${ma.toString()} failed as address did not have both relay and destination PeerIDs`
      this.log.error(`c${errMsg}`)
      throw new DialError(`C${errMsg}`)
    }

    const relayPeer = peerIdFromString(relayId)
    const destinationPeer = peerIdFromString(destinationId)

    const relayConnections = this.connectionManager.getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.peerStore.merge(relayPeer, {
        multiaddrs: [relayAddr]
      })

      options.onProgress?.(new CustomProgressEvent('circuit-relay:open-connection'))
      relayConnection = await this.connectionManager.openConnection(relayPeer, options)
    } else {
      options.onProgress?.(new CustomProgressEvent('circuit-relay:reuse-connection'))
    }

    let stream: Stream | undefined

    try {
      options.onProgress?.(new CustomProgressEvent('circuit-relay:open-hop-stream'))
      stream = await relayConnection.newStream(RELAY_V2_HOP_CODEC, options)

      const pbstr = pbStream(stream)
      const hopstr = pbstr.pb(HopMessage)

      options.onProgress?.(new CustomProgressEvent('circuit-relay:write-connect-message'))
      await hopstr.write({
        type: HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toMultihash().bytes,
          addrs: [multiaddr(destinationAddr).bytes]
        }
      }, options)

      options.onProgress?.(new CustomProgressEvent('circuit-relay:read-connect-response'))
      const status = await hopstr.read(options)

      if (status.status !== Status.OK) {
        throw new InvalidMessageError(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`)
      }

      const limits = new LimitTracker(status.limit)

      const maConn = streamToMaConnection({
        stream: pbstr.unwrap(),
        remoteAddr: ma,
        localAddr: relayAddr.encapsulate(`/p2p-circuit/p2p/${this.peerId.toString()}`),
        logger: this.logger,
        onDataRead: limits.onData,
        onDataWrite: limits.onData
      })

      this.log('new outbound relayed connection %a', maConn.remoteAddr)

      return await this.upgrader.upgradeOutbound(maConn, {
        ...options,
        limits: limits.getLimits()
      })
    } catch (err: any) {
      this.log.error('circuit relay dial to destination %p via relay %p failed', destinationPeer, relayPeer, err)
      stream?.abort(err)

      throw err
    }
  }

  /**
   * Create a listener
   */
  createListener (options: CreateListenerOptions): Listener {
    return createListener({
      peerId: this.peerId,
      connectionManager: this.connectionManager,
      addressManager: this.addressManager,
      reservationStore: this.reservationStore,
      logger: this.logger
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can listen on
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return CircuitListen.exactMatch(ma) || CircuitSearch.exactMatch(ma)
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return Circuit.exactMatch(ma)
    })
  }

  /**
   * An incoming STOP request means a remote peer wants to dial us via a relay
   */
  async onStop ({ connection, stream }: IncomingStreamData, signal: AbortSignal): Promise<void> {
    if (!this.reservationStore.hasReservation(connection.remotePeer)) {
      try {
        this.log('dialed via relay we did not have a reservation on, start listening on that relay address')
        await this.transportManager.listen([connection.remoteAddr.encapsulate('/p2p-circuit')])
      } catch (err: any) {
        // failed to refresh our hitherto unknown relay reservation but allow the connection attempt anyway
        this.log.error('failed to listen on a relay peer we were dialed via but did not have a reservation on', err)
      }
    }

    const pbstr = pbStream(stream).pb(StopMessage)
    const request = await pbstr.read({
      signal
    })

    this.log('new circuit relay v2 stop stream from %p with type %s', connection.remotePeer, request.type)

    if (request?.type === undefined) {
      this.log.error('type was missing from circuit v2 stop protocol request from %s', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, {
        signal
      })
      await stream.close()
      return
    }

    // Validate the STOP request has the required input
    if (request.type !== StopMessage.Type.CONNECT) {
      this.log.error('invalid stop connect request via peer %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE }, {
        signal
      })
      await stream.close()
      return
    }

    if (!isValidStop(request)) {
      this.log.error('invalid stop connect request via peer %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, {
        signal
      })
      await stream.close({
        signal
      })
      return
    }

    const remotePeerId = peerIdFromMultihash(Digest.decode(request.peer.id))

    if ((await this.connectionGater.denyInboundRelayedConnection?.(connection.remotePeer, remotePeerId)) === true) {
      this.log.error('connection gater denied inbound relayed connection from %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, {
        signal
      })
      await stream.close({
        signal
      })
      return
    }

    this.log.trace('sending success response to %p', connection.remotePeer)
    await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.OK }, {
      signal
    })

    const limits = new LimitTracker(request.limit)
    const remoteAddr = connection.remoteAddr.encapsulate(`/p2p-circuit/p2p/${remotePeerId.toString()}`)
    const localAddr = this.addressManager.getAddresses()[0]
    const maConn = streamToMaConnection({
      stream: pbstr.unwrap().unwrap(),
      remoteAddr,
      localAddr,
      logger: this.logger,
      onDataRead: limits.onData,
      onDataWrite: limits.onData
    })

    this.log('new inbound relayed connection %a', maConn.remoteAddr)
    await this.upgrader.upgradeInbound(maConn, {
      limits: limits.getLimits(),
      signal
    })
    this.log('%s connection %a upgraded', 'inbound', maConn.remoteAddr)
  }
}

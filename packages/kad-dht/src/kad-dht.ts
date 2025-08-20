import { NotFoundError, contentRoutingSymbol, peerDiscoverySymbol, peerRoutingSymbol, serviceCapabilities, serviceDependencies, start, stop } from '@libp2p/interface'
import drain from 'it-drain'
import { setMaxListeners, TypedEventEmitter } from 'main-event'
import pDefer from 'p-defer'
import { ALPHA, ON_PEER_CONNECT_TIMEOUT, PROTOCOL } from './constants.js'
import { ContentFetching } from './content-fetching/index.js'
import { ContentRouting as KADDHTContentRouting } from './content-routing/index.js'
import { Network } from './network.js'
import { PeerRouting as KADDHTPeerRouting } from './peer-routing/index.js'
import { Providers } from './providers.js'
import { QueryManager } from './query/manager.js'
import { QuerySelf } from './query-self.js'
import { selectors as recordSelectors } from './record/selectors.js'
import { validators as recordValidators } from './record/validators.js'
import { Reprovider } from './reprovider.js'
import { KBUCKET_SIZE, RoutingTable } from './routing-table/index.js'
import { RoutingTableRefresh } from './routing-table/refresh.js'
import { RPC } from './rpc/index.js'
import { TopologyListener } from './topology-listener.js'
import {
  multiaddrIsPublic,
  removePrivateAddressesMapper,
  timeOperationGenerator
} from './utils.js'
import type { KadDHTComponents, KadDHTInit, Validators, Selectors, KadDHT as KadDHTInterface, QueryEvent, PeerInfoMapper, SetModeOptions } from './index.js'
import type { ContentRouting, CounterGroup, Logger, MetricGroup, PeerDiscovery, PeerDiscoveryEvents, PeerId, PeerInfo, PeerRouting, RoutingOptions, Startable } from '@libp2p/interface'
import type { AbortOptions } from 'it-pushable'
import type { CID } from 'multiformats/cid'

/**
 * Wrapper class to convert events into returned values
 */
class DHTContentRouting implements ContentRouting {
  private readonly dht: KadDHTInterface

  constructor (dht: KadDHTInterface) {
    this.dht = dht
  }

  async provide (cid: CID, options: RoutingOptions = {}): Promise<void> {
    await drain(this.dht.provide(cid, options))
  }

  async cancelReprovide (key: CID): Promise<void> {
    await this.dht.cancelReprovide(key)
  }

  async * findProviders (cid: CID, options: RoutingOptions = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options?: RoutingOptions): Promise<void> {
    await drain(this.dht.put(key, value, options))
  }

  async get (key: Uint8Array, options?: RoutingOptions): Promise<Uint8Array> {
    for await (const event of this.dht.get(key, options)) {
      if (event.name === 'VALUE') {
        return event.value
      }
    }

    throw new NotFoundError('Could not find value for key')
  }
}

/**
 * Wrapper class to convert events into returned values
 */
class DHTPeerRouting implements PeerRouting {
  private readonly dht: KadDHTInterface

  constructor (dht: KadDHTInterface) {
    this.dht = dht
  }

  async findPeer (peerId: PeerId, options: RoutingOptions = {}): Promise<PeerInfo> {
    for await (const event of this.dht.findPeer(peerId, options)) {
      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
    }

    throw new NotFoundError('Peer not found')
  }

  async * getClosestPeers (key: Uint8Array, options: RoutingOptions = {}): AsyncIterable<PeerInfo> {
    for await (const event of this.dht.getClosestPeers(key, options)) {
      if (event.name === 'FINAL_PEER') {
        yield event.peer
      }
    }
  }
}

export const DEFAULT_MAX_INBOUND_STREAMS = 32
export const DEFAULT_MAX_OUTBOUND_STREAMS = 64

export type Operation = 'GET_VALUE' | 'FIND_PROVIDERS' | 'FIND_PEER' | 'GET_CLOSEST_PEERS' | 'PROVIDE' | 'PUT_VALUE' | 'SELF_QUERY'

export interface OperationMetrics {
  queries?: MetricGroup<Operation>
  errors?: CounterGroup<Operation>
  queryTime?: MetricGroup<Operation>
  errorTime?: MetricGroup<Operation>
}

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class KadDHT extends TypedEventEmitter<PeerDiscoveryEvents> implements KadDHTInterface, Startable {
  public readonly k: number
  public readonly a: number
  public readonly d: number
  public protocol: string
  public routingTable: RoutingTable
  public providers: Providers
  public network: Network
  public peerRouting: KADDHTPeerRouting

  public readonly components: KadDHTComponents
  private readonly log: Logger
  private running: boolean
  private clientMode: boolean
  private readonly validators: Validators
  private readonly selectors: Selectors
  private readonly queryManager: QueryManager
  private readonly contentFetching: ContentFetching
  private readonly contentRouting: KADDHTContentRouting
  private readonly routingTableRefresh: RoutingTableRefresh
  private readonly rpc: RPC
  private readonly topologyListener: TopologyListener
  private readonly querySelf: QuerySelf
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number

  private readonly dhtContentRouting: DHTContentRouting
  private readonly dhtPeerRouting: DHTPeerRouting
  private readonly peerInfoMapper: PeerInfoMapper
  private readonly reprovider: Reprovider
  private readonly onPeerConnectTimeout: number

  /**
   * Create a new KadDHT
   */
  constructor (components: KadDHTComponents, init: KadDHTInit = {}) {
    super()

    const logPrefix = init.logPrefix ?? 'libp2p:kad-dht'
    const datastorePrefix = init.datastorePrefix ?? '/dht'
    const metricsPrefix = init.metricsPrefix ?? 'libp2p_kad_dht'

    const operationMetrics: OperationMetrics = {
      queries: components.metrics?.registerMetricGroup(`${metricsPrefix}_operations_total`, { label: 'operation' }),
      errors: components.metrics?.registerCounterGroup(`${metricsPrefix}_operation_errors_total`, { label: 'operation' }),
      queryTime: components.metrics?.registerMetricGroup(`${metricsPrefix}_operation_time_seconds`, { label: 'operation' }),
      errorTime: components.metrics?.registerMetricGroup(`${metricsPrefix}_operation_error_time_seconds`, { label: 'operation' })
    }

    this.running = false
    this.components = components
    this.log = components.logger.forComponent(logPrefix)
    this.k = init.kBucketSize ?? KBUCKET_SIZE
    this.a = init.alpha ?? ALPHA
    this.d = init.disjointPaths ?? this.a
    this.protocol = init.protocol ?? PROTOCOL
    this.clientMode = init.clientMode ?? true
    this.maxInboundStreams = init.maxInboundStreams ?? DEFAULT_MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? DEFAULT_MAX_OUTBOUND_STREAMS
    this.peerInfoMapper = init.peerInfoMapper ?? removePrivateAddressesMapper
    this.onPeerConnectTimeout = init.onPeerConnectTimeout ?? ON_PEER_CONNECT_TIMEOUT

    this.providers = new Providers(components, {
      ...init.providers,
      logPrefix,
      datastorePrefix
    })

    this.validators = {
      ...recordValidators,
      ...init.validators
    }
    this.selectors = {
      ...recordSelectors,
      ...init.selectors
    }
    this.network = new Network(components, {
      protocol: this.protocol,
      logPrefix,
      metricsPrefix
    })

    this.routingTable = new RoutingTable(components, {
      kBucketSize: this.k,
      pingOldContactTimeout: init.pingOldContactTimeout,
      pingOldContactConcurrency: init.pingOldContactConcurrency,
      pingOldContactMaxQueueSize: init.pingOldContactMaxQueueSize,
      pingNewContactTimeout: init.pingNewContactTimeout,
      pingNewContactConcurrency: init.pingNewContactConcurrency,
      pingNewContactMaxQueueSize: init.pingNewContactMaxQueueSize,
      protocol: this.protocol,
      logPrefix,
      metricsPrefix,
      prefixLength: init.prefixLength,
      splitThreshold: init.kBucketSplitThreshold,
      network: this.network
    })

    // all queries should wait for the initial query-self query to run so we have
    // some peers and don't force consumers to use arbitrary timeouts
    const initialQuerySelfHasRun = pDefer<any>()

    // if the user doesn't want to wait for query peers, resolve the initial
    // self-query promise immediately
    if (init.allowQueryWithZeroPeers === true) {
      initialQuerySelfHasRun.resolve()
    }

    this.queryManager = new QueryManager(components, {
      disjointPaths: this.d,
      alpha: this.a,
      logPrefix,
      metricsPrefix,
      initialQuerySelfHasRun,
      routingTable: this.routingTable,
      allowQueryWithZeroPeers: init.allowQueryWithZeroPeers
    })

    // DHT components
    this.peerRouting = new KADDHTPeerRouting(components, {
      routingTable: this.routingTable,
      network: this.network,
      validators: this.validators,
      queryManager: this.queryManager,
      logPrefix
    })
    this.contentFetching = new ContentFetching(components, {
      validators: this.validators,
      selectors: this.selectors,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      network: this.network,
      logPrefix,
      datastorePrefix
    })
    this.contentRouting = new KADDHTContentRouting(components, {
      network: this.network,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      routingTable: this.routingTable,
      providers: this.providers,
      logPrefix
    })
    this.routingTableRefresh = new RoutingTableRefresh(components, {
      peerRouting: this.peerRouting,
      routingTable: this.routingTable,
      logPrefix
    })
    this.rpc = new RPC(components, {
      routingTable: this.routingTable,
      providers: this.providers,
      peerRouting: this.peerRouting,
      validators: this.validators,
      logPrefix,
      metricsPrefix,
      datastorePrefix,
      peerInfoMapper: this.peerInfoMapper
    })
    this.topologyListener = new TopologyListener(components, {
      protocol: this.protocol,
      logPrefix
    })
    this.querySelf = new QuerySelf(components, {
      peerRouting: this.peerRouting,
      interval: init.querySelfInterval,
      initialInterval: init.initialQuerySelfInterval,
      logPrefix,
      initialQuerySelfHasRun,
      operationMetrics
    })
    this.reprovider = new Reprovider(components, {
      ...init.reprovide,
      logPrefix,
      metricsPrefix,
      datastorePrefix,
      contentRouting: this.contentRouting,
      operationMetrics
    })

    // handle peers being discovered during processing of DHT messages
    this.network.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      this.onPeerConnect(peerData).catch(err => {
        this.log.error('could not add %p to routing table', peerData.id, err)
      })

      this.dispatchEvent(new CustomEvent('peer', {
        detail: peerData
      }))
    })

    // handle peers being discovered via other peer discovery mechanisms
    this.topologyListener.addEventListener('peer', (evt) => {
      const peerId = evt.detail

      Promise.resolve().then(async () => {
        const peer = await this.components.peerStore.get(peerId)

        const peerData = {
          id: peerId,
          multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr),
          protocols: peer.protocols
        }

        await this.onPeerConnect(peerData)
      }).catch(err => {
        this.log.error('could not add %p to routing table - %e - %e', peerId, err)
      })
    })

    this.dhtPeerRouting = new DHTPeerRouting(this)
    this.dhtContentRouting = new DHTContentRouting(this)

    // if client mode has not been explicitly specified, auto-switch to server
    // mode when the node's peer data is updated with publicly dialable
    // addresses
    if (init.clientMode == null) {
      components.events.addEventListener('self:peer:update', (evt) => {
        this.log('received update of self-peer info')

        void Promise.resolve().then(async () => {
          const hasPublicAddress = evt.detail.peer.addresses
            .some(({ multiaddr }) => multiaddrIsPublic(multiaddr))

          const mode = this.getMode()

          if (hasPublicAddress && mode === 'client') {
            await this.setMode('server')
          } else if (mode === 'server' && !hasPublicAddress) {
            await this.setMode('client')
          }
        })
          .catch(err => {
            this.log.error('error setting dht server mode', err)
          })
      })
    }

    this.get = timeOperationGenerator(this.get.bind(this), operationMetrics, 'GET_VALUE')
    this.findProviders = timeOperationGenerator(this.findProviders.bind(this), operationMetrics, 'FIND_PROVIDERS')
    this.findPeer = timeOperationGenerator(this.findPeer.bind(this), operationMetrics, 'FIND_PEER')
    this.getClosestPeers = timeOperationGenerator(this.getClosestPeers.bind(this), operationMetrics, 'GET_CLOSEST_PEERS')
    this.provide = timeOperationGenerator(this.provide.bind(this), operationMetrics, 'PROVIDE')
    this.put = timeOperationGenerator(this.put.bind(this), operationMetrics, 'PUT_VALUE')
  }

  readonly [Symbol.toStringTag] = '@libp2p/kad-dht'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/content-routing',
    '@libp2p/peer-routing',
    '@libp2p/peer-discovery',
    '@libp2p/kad-dht'
  ]

  readonly [serviceDependencies]: string[] = [
    '@libp2p/identify',
    '@libp2p/ping'
  ]

  get [contentRoutingSymbol] (): ContentRouting {
    return this.dhtContentRouting
  }

  get [peerRoutingSymbol] (): PeerRouting {
    return this.dhtPeerRouting
  }

  get [peerDiscoverySymbol] (): PeerDiscovery {
    return this
  }

  async onPeerConnect (peerData: PeerInfo): Promise<void> {
    this.log.trace('peer %p connected', peerData.id)

    peerData = this.peerInfoMapper(peerData)

    if (peerData.multiaddrs.length === 0) {
      this.log.trace('ignoring %p as there were no valid addresses in %s after filtering', peerData.id, peerData.multiaddrs.map(addr => addr.toString()))
      return
    }

    const signal = AbortSignal.timeout(this.onPeerConnectTimeout)
    setMaxListeners(Infinity, signal)

    try {
      await this.routingTable.add(peerData.id, {
        signal
      })
    } catch (err: any) {
      this.log.error('could not add %p to routing table', peerData.id, err)
    }
  }

  /**
   * Is this DHT running.
   */
  isStarted (): boolean {
    return this.running
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  getMode (): 'client' | 'server' {
    return this.clientMode ? 'client' : 'server'
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  async setMode (mode: 'client' | 'server', options?: SetModeOptions): Promise<void> {
    if (mode === this.getMode() && options?.force !== true) {
      this.log('already in %s mode', mode)
      return
    }

    await this.components.registrar.unhandle(this.protocol, options)

    // check again after async work
    if (mode === this.getMode() && options?.force !== true) {
      this.log('already in %s mode', mode)
      return
    }

    if (mode === 'client') {
      this.log('enabling client mode while in %s mode', this.getMode())
      this.clientMode = true
    } else {
      this.log('enabling server mode while in %s mode', this.getMode())
      this.clientMode = false
      await this.components.registrar.handle(this.protocol, this.rpc.onIncomingStream.bind(this.rpc), {
        signal: options?.signal,
        maxInboundStreams: this.maxInboundStreams,
        maxOutboundStreams: this.maxOutboundStreams
      })
    }
  }

  /**
   * Start listening to incoming connections.
   */
  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true

    // Only respond to queries when not in client mode
    await this.setMode(this.clientMode ? 'client' : 'server', {
      force: true
    })

    await start(
      this.routingTable,
      this.queryManager,
      this.network,
      this.topologyListener,
      this.routingTableRefresh,
      this.reprovider
    )

    // Query self after other components are configured
    await start(
      this.querySelf
    )
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop (): Promise<void> {
    this.running = false

    await stop(
      this.querySelf,
      this.queryManager,
      this.network,
      this.routingTable,
      this.routingTableRefresh,
      this.topologyListener,
      this.reprovider
    )
  }

  /**
   * Store the given key/value pair in the DHT
   */
  async * put (key: Uint8Array, value: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<any, void, undefined> {
    yield * this.contentFetching.put(key, value, options)
  }

  /**
   * Get the value that corresponds to the passed key
   */
  async * get (key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<QueryEvent, void, undefined> {
    yield * this.contentFetching.get(key, options)
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value
   */
  async * provide (key: CID, options: RoutingOptions = {}): AsyncGenerator<QueryEvent, void, undefined> {
    yield * this.contentRouting.provide(key, this.components.addressManager.getAddresses(), options)
  }

  /**
   * Provider records must be re-published every 24 hours - pass a previously
   * provided CID here to not re-publish a record for it any more
   */
  async cancelReprovide (key: CID, options?: AbortOptions): Promise<void> {
    await this.providers.removeProvider(key, this.components.peerId, options)
  }

  /**
   * Search the dht for providers of the given CID
   */
  async * findProviders (key: CID, options: RoutingOptions = {}): AsyncGenerator<QueryEvent, any, unknown> {
    yield * this.contentRouting.findProviders(key, options)
  }

  // ----------- Peer Routing -----------

  /**
   * Search for a peer with the given ID
   */
  async * findPeer (id: PeerId, options: RoutingOptions = {}): AsyncGenerator<QueryEvent, any, unknown> {
    yield * this.peerRouting.findPeer(id, options)
  }

  /**
   * Kademlia 'node lookup' operation
   */
  async * getClosestPeers (key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<QueryEvent, any, unknown> {
    yield * this.peerRouting.getClosestPeers(key, options)
  }

  async refreshRoutingTable (options?: AbortOptions): Promise<void> {
    this.routingTableRefresh.refreshTable(true, options)
  }
}

import { CodeError, CustomEvent, TypedEventEmitter, contentRoutingSymbol, peerDiscoverySymbol, peerRoutingSymbol } from '@libp2p/interface'
import drain from 'it-drain'
import pDefer from 'p-defer'
import { PROTOCOL } from './constants.js'
import { ContentFetching } from './content-fetching/index.js'
import { ContentRouting as KADDHTContentRouting } from './content-routing/index.js'
import { Network } from './network.js'
import { PeerRouting as KADDHTPeerRouting } from './peer-routing/index.js'
import { Providers } from './providers.js'
import { QueryManager } from './query/manager.js'
import { QuerySelf } from './query-self.js'
import { selectors as recordSelectors } from './record/selectors.js'
import { validators as recordValidators } from './record/validators.js'
import { RoutingTable } from './routing-table/index.js'
import { RoutingTableRefresh } from './routing-table/refresh.js'
import { RPC } from './rpc/index.js'
import { TopologyListener } from './topology-listener.js'
import {
  multiaddrIsPublic,
  removePrivateAddressesMapper
} from './utils.js'
import type { KadDHTComponents, KadDHTInit, Validators, Selectors, KadDHT as KadDHTInterface, QueryEvent, PeerInfoMapper } from './index.js'
import type { ContentRouting, Logger, PeerDiscovery, PeerDiscoveryEvents, PeerId, PeerInfo, PeerRouting, RoutingOptions, Startable } from '@libp2p/interface'
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

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
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

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
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

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class KadDHT extends TypedEventEmitter<PeerDiscoveryEvents> implements KadDHTInterface, Startable {
  public protocol: string
  public routingTable: RoutingTable
  public providers: Providers
  public network: Network
  public peerRouting: KADDHTPeerRouting

  public readonly components: KadDHTComponents
  private readonly log: Logger
  private running: boolean
  private readonly kBucketSize: number
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

  /**
   * Create a new KadDHT
   */
  constructor (components: KadDHTComponents, init: KadDHTInit) {
    super()

    const {
      kBucketSize,
      clientMode,
      validators,
      selectors,
      querySelfInterval,
      protocol,
      logPrefix,
      pingTimeout,
      pingConcurrency,
      maxInboundStreams,
      maxOutboundStreams,
      providers: providersInit
    } = init

    const loggingPrefix = logPrefix ?? 'libp2p:kad-dht'

    this.running = false
    this.components = components
    this.log = components.logger.forComponent(loggingPrefix)
    this.protocol = protocol ?? PROTOCOL
    this.kBucketSize = kBucketSize ?? 20
    this.clientMode = clientMode ?? true
    this.maxInboundStreams = maxInboundStreams ?? DEFAULT_MAX_INBOUND_STREAMS
    this.maxOutboundStreams = maxOutboundStreams ?? DEFAULT_MAX_OUTBOUND_STREAMS
    this.peerInfoMapper = init.peerInfoMapper ?? removePrivateAddressesMapper
    this.routingTable = new RoutingTable(components, {
      kBucketSize,
      pingTimeout,
      pingConcurrency,
      protocol: this.protocol,
      logPrefix: loggingPrefix
    })

    this.providers = new Providers(components, providersInit ?? {})

    this.validators = {
      ...recordValidators,
      ...validators
    }
    this.selectors = {
      ...recordSelectors,
      ...selectors
    }
    this.network = new Network(components, {
      protocol: this.protocol,
      logPrefix: loggingPrefix
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
      // Number of disjoint query paths to use - This is set to `kBucketSize/2` per the S/Kademlia paper
      disjointPaths: Math.ceil(this.kBucketSize / 2),
      logPrefix: loggingPrefix,
      initialQuerySelfHasRun,
      routingTable: this.routingTable
    })

    // DHT components
    this.peerRouting = new KADDHTPeerRouting(components, {
      routingTable: this.routingTable,
      network: this.network,
      validators: this.validators,
      queryManager: this.queryManager,
      logPrefix: loggingPrefix
    })
    this.contentFetching = new ContentFetching(components, {
      validators: this.validators,
      selectors: this.selectors,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      network: this.network,
      logPrefix: loggingPrefix
    })
    this.contentRouting = new KADDHTContentRouting(components, {
      network: this.network,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      routingTable: this.routingTable,
      providers: this.providers,
      logPrefix: loggingPrefix
    })
    this.routingTableRefresh = new RoutingTableRefresh(components, {
      peerRouting: this.peerRouting,
      routingTable: this.routingTable,
      logPrefix: loggingPrefix
    })
    this.rpc = new RPC(components, {
      routingTable: this.routingTable,
      providers: this.providers,
      peerRouting: this.peerRouting,
      validators: this.validators,
      logPrefix: loggingPrefix,
      peerInfoMapper: this.peerInfoMapper
    })
    this.topologyListener = new TopologyListener(components, {
      protocol: this.protocol,
      logPrefix: loggingPrefix
    })
    this.querySelf = new QuerySelf(components, {
      peerRouting: this.peerRouting,
      interval: querySelfInterval,
      initialInterval: init.initialQuerySelfInterval,
      logPrefix: loggingPrefix,
      initialQuerySelfHasRun,
      routingTable: this.routingTable
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
        this.log.error('could not add %p to routing table', peerId, err)
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
  }

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
    this.log('peer %p connected', peerData.id)

    peerData = this.peerInfoMapper(peerData)

    if (peerData.multiaddrs.length === 0) {
      this.log('ignoring %p as there were no valid addresses in %s after filtering', peerData.id, peerData.multiaddrs.map(addr => addr.toString()))
      return
    }

    try {
      await this.routingTable.add(peerData.id)
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
  async setMode (mode: 'client' | 'server'): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)

    if (mode === 'client') {
      this.log('enabling client mode')
      this.clientMode = true
    } else {
      this.log('enabling server mode')
      this.clientMode = false
      await this.components.registrar.handle(this.protocol, this.rpc.onIncomingStream.bind(this.rpc), {
        maxInboundStreams: this.maxInboundStreams,
        maxOutboundStreams: this.maxOutboundStreams
      })
    }
  }

  /**
   * Start listening to incoming connections.
   */
  async start (): Promise<void> {
    this.running = true

    // Only respond to queries when not in client mode
    await this.setMode(this.clientMode ? 'client' : 'server')

    this.querySelf.start()

    await Promise.all([
      this.providers.start(),
      this.queryManager.start(),
      this.network.start(),
      this.routingTable.start(),
      this.topologyListener.start(),
      this.routingTableRefresh.start()
    ])
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop (): Promise<void> {
    this.running = false

    this.querySelf.stop()

    await Promise.all([
      this.providers.stop(),
      this.queryManager.stop(),
      this.network.stop(),
      this.routingTable.stop(),
      this.routingTableRefresh.stop(),
      this.topologyListener.stop()
    ])
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

  async refreshRoutingTable (): Promise<void> {
    this.routingTableRefresh.refreshTable(true)
  }
}

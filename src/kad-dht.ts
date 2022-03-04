import { RoutingTable } from './routing-table/index.js'
import { RoutingTableRefresh } from './routing-table/refresh.js'
import { Network } from './network.js'
import { ContentFetching } from './content-fetching/index.js'
import { ContentRouting } from './content-routing/index.js'
import { PeerRouting } from './peer-routing/index.js'
import { Providers } from './providers.js'
import { QueryManager } from './query/manager.js'
import { RPC } from './rpc/index.js'
import { TopologyListener } from './topology-listener.js'
import { QuerySelf } from './query-self.js'
import {
  removePrivateAddresses,
  removePublicAddresses
} from './utils.js'
import { Logger, logger } from '@libp2p/logger'
import type { DHT, QueryOptions, Validators, Selectors } from '@libp2p/interfaces/dht'
import type { PeerData } from '@libp2p/interfaces/peer-data'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces'
import type { Addressable, Dialer } from '@libp2p/interfaces'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PeerStore } from '@libp2p/interfaces/peer-store'
import type { ComponentMetricsTracker } from '@libp2p/interfaces/metrics'
import type { Datastore } from 'interface-datastore'
import type { Registrar } from '@libp2p/interfaces/registrar'
import type { CID } from 'multiformats/cid'
import type { PeerDiscoveryEvents } from '@libp2p/interfaces/peer-discovery'

export interface KadDHTOptions {
  /**
   * libp2p registrar handle protocol
   */
  protocol: string

  /**
   * k-bucket size (default 20)
   */
  kBucketSize?: number

  /**
   * If true, the DHT will not respond to queries. This should be true if your node will not be dialable. (default: false)
   */
  clientMode?: boolean

  /**
   * validators object with namespace as keys and function(key, record, callback)
   */
  validators: Validators

  /**
   * selectors object with namespace as keys and function(key, records)
   */
  selectors: Selectors

  /**
   * how often to search the network for peers close to ourselves
   */
  querySelfInterval: number
  lan: boolean
  bootstrapPeers: PeerData[]
  dialer: Dialer
  addressable: Addressable
  peerStore: PeerStore
  peerId: PeerId
  datastore: Datastore
  registrar: Registrar
  metrics?: ComponentMetricsTracker
}

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class KadDHT extends EventEmitter<PeerDiscoveryEvents> implements DHT {
  private readonly log: Logger
  private running: boolean
  public protocol: string
  private readonly kBucketSize: number
  private clientMode: boolean
  private readonly bootstrapPeers: PeerData[]
  public routingTable: RoutingTable
  public providers: Providers
  private readonly lan: boolean
  private readonly validators: Validators
  private readonly selectors: Selectors
  public network: Network
  private readonly queryManager: QueryManager
  public peerRouting: PeerRouting
  private readonly contentFetching: ContentFetching
  private readonly contentRouting: ContentRouting
  private readonly routingTableRefresh: RoutingTableRefresh
  private readonly rpc: RPC
  private readonly topologyListener: TopologyListener
  private readonly querySelf: QuerySelf
  public addressable: Addressable
  public registrar: Registrar
  private registrarHandleId?: string

  /**
   * Create a new KadDHT
   */
  constructor (options: KadDHTOptions) {
    super()

    const {
      kBucketSize,
      clientMode,
      validators,
      selectors,
      querySelfInterval,
      lan,
      protocol,
      bootstrapPeers,
      dialer,
      addressable,
      peerId,
      peerStore,
      metrics,
      datastore,
      registrar
    } = options

    this.running = false
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}`)
    this.protocol = protocol ?? '/ipfs/kad/1.0.0'
    this.kBucketSize = kBucketSize ?? 20
    this.clientMode = clientMode ?? true
    this.bootstrapPeers = bootstrapPeers ?? []
    this.addressable = addressable
    this.registrar = registrar
    this.routingTable = new RoutingTable({
      peerId,
      dialer,
      kBucketSize,
      metrics,
      lan
    })

    this.providers = new Providers({
      datastore
    })
    this.lan = lan
    this.validators = validators ?? {}
    this.selectors = selectors ?? {}
    this.network = new Network({
      dialer,
      protocol: this.protocol,
      lan,
      peerId
    })
    this.queryManager = new QueryManager({
      peerId: peerId,
      // Number of disjoint query paths to use - This is set to `kBucketSize/2` per the S/Kademlia paper
      disjointPaths: Math.ceil(this.kBucketSize / 2),
      metrics,
      lan
    })

    // DHT components
    this.peerRouting = new PeerRouting({
      peerId,
      routingTable: this.routingTable,
      peerStore,
      network: this.network,
      validators: this.validators,
      queryManager: this.queryManager,
      lan
    })
    this.contentFetching = new ContentFetching({
      peerId,
      datastore,
      validators: this.validators,
      selectors: this.selectors,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      routingTable: this.routingTable,
      network: this.network,
      lan
    })
    this.contentRouting = new ContentRouting({
      peerId,
      network: this.network,
      peerRouting: this.peerRouting,
      queryManager: this.queryManager,
      routingTable: this.routingTable,
      providers: this.providers,
      peerStore,
      lan
    })
    this.routingTableRefresh = new RoutingTableRefresh({
      peerRouting: this.peerRouting,
      routingTable: this.routingTable,
      lan
    })
    this.rpc = new RPC({
      peerId,
      routingTable: this.routingTable,
      providers: this.providers,
      peerRouting: this.peerRouting,
      datastore,
      validators: this.validators,
      keyBook: peerStore.keyBook,
      addressBook: peerStore.addressBook,
      lan
    })
    this.topologyListener = new TopologyListener({
      registrar,
      protocol: this.protocol,
      lan
    })
    this.querySelf = new QuerySelf({
      peerId,
      peerRouting: this.peerRouting,
      interval: querySelfInterval,
      lan
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
        const multiaddrs = await peerStore.addressBook.get(peerId)

        const peerData = {
          id: peerId,
          multiaddrs: multiaddrs.map(addr => addr.multiaddr),
          protocols: []
        }

        await this.onPeerConnect(peerData)
      }).catch(err => {
        this.log.error('could not add %p to routing table', peerId, err)
      })
    })
  }

  async onPeerConnect (peerData: PeerData) {
    this.log('peer %p connected', peerData.id)

    if (this.lan) {
      peerData = removePublicAddresses(peerData)
    } else {
      peerData = removePrivateAddresses(peerData)
    }

    if (peerData.multiaddrs.length === 0) {
      this.log('ignoring %p as they do not have any %s addresses in %s', peerData.id, this.lan ? 'private' : 'public', peerData.multiaddrs.map(addr => addr.toString()))
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
  isStarted () {
    return this.running
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  async getMode () {
    return this.clientMode ? 'client' : 'server'
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  async setMode (mode: 'client' | 'server') {
    if (this.registrarHandleId != null) {
      await this.registrar.unhandle(this.registrarHandleId)
    }

    if (mode === 'client') {
      this.log('enabling client mode')
      this.clientMode = true
    } else {
      this.log('enabling server mode')
      this.clientMode = false
      this.registrarHandleId = await this.registrar.handle(this.protocol, this.rpc.onIncomingStream.bind(this.rpc))
    }
  }

  /**
   * Start listening to incoming connections.
   */
  async start () {
    this.running = true

    // Only respond to queries when not in client mode
    await this.setMode(this.clientMode ? 'client' : 'server')

    await Promise.all([
      this.providers.start(),
      this.queryManager.start(),
      this.network.start(),
      this.routingTable.start(),
      this.topologyListener.start(),
      this.querySelf.start()
    ])

    await Promise.all(
      this.bootstrapPeers.map(async peerData => await this.routingTable.add(peerData.id))
    )

    await this.routingTableRefresh.start()
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop () {
    this.running = false

    await Promise.all([
      this.providers.stop(),
      this.queryManager.stop(),
      this.network.stop(),
      this.routingTable.stop(),
      this.routingTableRefresh.stop(),
      this.topologyListener.stop(),
      this.querySelf.stop()
    ])
  }

  /**
   * Store the given key/value pair in the DHT
   */
  async * put (key: Uint8Array, value: Uint8Array, options: QueryOptions = {}) { // eslint-disable-line require-await
    yield * this.contentFetching.put(key, value, options)
  }

  /**
   * Get the value that corresponds to the passed key
   */
  async * get (key: Uint8Array, options: QueryOptions = {}) { // eslint-disable-line require-await
    yield * this.contentFetching.get(key, options)
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value
   */
  async * provide (key: CID, options: QueryOptions = {}) { // eslint-disable-line require-await
    yield * this.contentRouting.provide(key, this.addressable.multiaddrs, options)
  }

  /**
   * Search the dht for providers of the given CID
   */
  async * findProviders (key: CID, options: QueryOptions = {}) {
    yield * this.contentRouting.findProviders(key, options)
  }

  // ----------- Peer Routing -----------

  /**
   * Search for a peer with the given ID
   */
  async * findPeer (id: PeerId, options: QueryOptions = {}) { // eslint-disable-line require-await
    yield * this.peerRouting.findPeer(id, options)
  }

  /**
   * Kademlia 'node lookup' operation
   */
  async * getClosestPeers (key: Uint8Array, options: QueryOptions = {}) {
    yield * this.peerRouting.getClosestPeers(key, options)
  }

  async refreshRoutingTable () {
    await this.routingTableRefresh.refreshTable(true)
  }
}

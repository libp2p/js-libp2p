import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interfaces'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import { Startable, isStartable } from '@libp2p/interfaces/startable'
import type { Multiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core/memory'
import { DefaultPeerRouting } from './peer-routing.js'
import { CompoundContentRouting } from './content-routing/index.js'
import { getPeer } from './get-peer.js'
import { codes } from './errors.js'
import { DefaultAddressManager } from './address-manager/index.js'
import { DefaultConnectionManager } from './connection-manager/index.js'
import { AutoDialler } from './connection-manager/auto-dialler.js'
import { Circuit } from './circuit/transport.js'
import { Relay } from './circuit/index.js'
import { KeyChain } from './keychain/index.js'
import { DefaultMetrics } from './metrics/index.js'
import { DefaultTransportManager } from './transport-manager.js'
import { DefaultUpgrader } from './upgrader.js'
import { DefaultRegistrar } from './registrar.js'
import { IdentifyService } from './identify/index.js'
import { FetchService } from './fetch/index.js'
import { PingService } from './ping/index.js'
import { NatManager } from './nat-manager.js'
import { PeerRecordUpdater } from './peer-record-updater.js'
import { DHTPeerRouting } from './dht/dht-peer-routing.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DHTContentRouting } from './dht/dht-content-routing.js'
import { AutoDialer } from './connection-manager/dialer/auto-dialer.js'
import { Initializable, Components, isInitializable } from '@libp2p/components'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Connection } from '@libp2p/interface-connection'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PubSub } from '@libp2p/interface-pubsub'
import type { Registrar, StreamHandler, StreamHandlerOptions } from '@libp2p/interface-registrar'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Libp2p, Libp2pEvents, Libp2pInit, Libp2pOptions } from './index.js'
import { validateConfig } from './config.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { DualDHT } from '@libp2p/interface-dht'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import errCode from 'err-code'
import { unmarshalPublicKey } from '@libp2p/crypto/keys'
import type { Metrics } from '@libp2p/interface-metrics'
import { DummyDHT } from './dht/dummy-dht.js'
import { DummyPubSub } from './pubsub/dummy-pubsub.js'
import { PeerSet } from '@libp2p/peer-collections'
import { DefaultDialer } from './connection-manager/dialer/index.js'

const log = logger('libp2p')

export class Libp2pNode extends EventEmitter<Libp2pEvents> implements Libp2p {
  public peerId: PeerId
  public dht: DualDHT
  public pubsub: PubSub
  public identifyService?: IdentifyService
  public fetchService: FetchService
  public pingService: PingService
  public components: Components
  public peerStore: PeerStore
  public contentRouting: ContentRouting
  public peerRouting: PeerRouting
  public keychain: KeyChain
  public connectionManager: ConnectionManager
  public registrar: Registrar
  public metrics?: Metrics

  private started: boolean
  private readonly services: Startable[]
  private readonly initializables: Initializable[]

  constructor (init: Libp2pInit) {
    super()

    this.initializables = []
    this.started = false
    this.peerId = init.peerId
    this.components = new Components({
      peerId: init.peerId,
      datastore: init.datastore ?? new MemoryDatastore(),
      connectionGater: {
        denyDialPeer: async () => await Promise.resolve(false),
        denyDialMultiaddr: async () => await Promise.resolve(false),
        denyInboundConnection: async () => await Promise.resolve(false),
        denyOutboundConnection: async () => await Promise.resolve(false),
        denyInboundEncryptedConnection: async () => await Promise.resolve(false),
        denyOutboundEncryptedConnection: async () => await Promise.resolve(false),
        denyInboundUpgradedConnection: async () => await Promise.resolve(false),
        denyOutboundUpgradedConnection: async () => await Promise.resolve(false),
        filterMultiaddrForPeer: async () => await Promise.resolve(true),
        ...init.connectionGater
      }
    })
    this.components.setPeerStore(new PersistentPeerStore({
      addressFilter: this.components.getConnectionGater().filterMultiaddrForPeer,
      ...init.peerStore
    }))

    this.services = [
      this.components
    ]

    // Create Metrics
    if (init.metrics.enabled) {
      this.metrics = this.components.setMetrics(new DefaultMetrics(init.metrics))
    }

    this.peerStore = this.components.getPeerStore()

    this.peerStore.addEventListener('peer', evt => {
      const { detail: peerData } = evt

      this.dispatchEvent(new CustomEvent<PeerInfo>('peer:discovery', { detail: peerData }))
    })

    // Set up connection protector if configured
    if (init.connectionProtector != null) {
      this.components.setConnectionProtector(init.connectionProtector)
    }

    // Set up the Upgrader
    this.components.setUpgrader(new DefaultUpgrader(this.components, {
      connectionEncryption: (init.connectionEncryption ?? []).map(component => this.configureComponent(component)),
      muxers: (init.streamMuxers ?? []).map(component => this.configureComponent(component)),
      inboundUpgradeTimeout: init.connectionManager.inboundUpgradeTimeout
    }))

    // Create the dialer
    this.components.setDialer(new DefaultDialer(this.components, init.connectionManager))

    // Create the Connection Manager
    this.connectionManager = this.components.setConnectionManager(new DefaultConnectionManager(init.connectionManager))

    // Create the Registrar
    this.registrar = this.components.setRegistrar(new DefaultRegistrar(this.components))

    // Setup the transport manager
    this.components.setTransportManager(new DefaultTransportManager(this.components, init.transportManager))

    // Addresses {listen, announce, noAnnounce}
    this.components.setAddressManager(new DefaultAddressManager(this.components, init.addresses))

    // update our peer record when addresses change
    this.configureComponent(new PeerRecordUpdater(this.components))

    this.configureComponent(new AutoDialler(this.components, {
      enabled: init.connectionManager.autoDial,
      minConnections: init.connectionManager.minConnections,
      autoDialInterval: init.connectionManager.autoDialInterval
    }))

    // Create keychain
    const keychainOpts = KeyChain.generateOptions()
    this.keychain = this.configureComponent(new KeyChain(this.components, {
      ...keychainOpts,
      ...init.keychain
    }))

    // Create the Nat Manager
    this.services.push(new NatManager(this.components, init.nat))

    init.transports.forEach((transport) => {
      this.components.getTransportManager().add(this.configureComponent(transport))
    })

    // Attach stream multiplexers
    if (init.streamMuxers != null && init.streamMuxers.length > 0) {
      // Add the identify service since we can multiplex
      this.identifyService = new IdentifyService(this.components, {
        ...init.identify
      })
      this.configureComponent(this.identifyService)
    }

    // dht provided components (peerRouting, contentRouting, dht)
    if (init.dht != null) {
      this.dht = this.components.setDHT(init.dht)
    } else {
      this.dht = new DummyDHT()
    }

    // Create pubsub if provided
    if (init.pubsub != null) {
      this.pubsub = this.components.setPubSub(init.pubsub)
    } else {
      this.pubsub = new DummyPubSub()
    }

    // Attach remaining APIs
    // peer and content routing will automatically get modules from _modules and _dht

    const peerRouters: PeerRouting[] = (init.peerRouters ?? []).map(component => this.configureComponent(component))

    if (init.dht != null) {
      // add dht to routers
      peerRouters.push(this.configureComponent(new DHTPeerRouting(this.dht)))

      // use dht for peer discovery
      this.dht.addEventListener('peer', (evt) => {
        this.onDiscoveryPeer(evt)
      })
    }

    this.peerRouting = this.components.setPeerRouting(this.configureComponent(new DefaultPeerRouting(this.components, {
      ...init.peerRouting,
      routers: peerRouters
    })))

    const contentRouters: ContentRouting[] = (init.contentRouters ?? []).map(component => this.configureComponent(component))

    if (init.dht != null) {
      // add dht to routers
      contentRouters.push(this.configureComponent(new DHTContentRouting(this.dht)))
    }

    this.contentRouting = this.components.setContentRouting(this.configureComponent(new CompoundContentRouting(this.components, {
      routers: contentRouters
    })))

    if (init.relay.enabled) {
      this.components.getTransportManager().add(this.configureComponent(new Circuit(init.relay)))

      this.configureComponent(new Relay(this.components, {
        addressSorter: init.connectionManager.addressSorter,
        ...init.relay
      }))
    }

    this.fetchService = this.configureComponent(new FetchService(this.components, {
      ...init.fetch
    }))

    this.pingService = this.configureComponent(new PingService(this.components, {
      ...init.ping
    }))

    const autoDialer = this.configureComponent(new AutoDialer(this.components, {
      enabled: init.connectionManager.autoDial !== false,
      minConnections: init.connectionManager.minConnections,
      dialTimeout: init.connectionManager.dialTimeout ?? 30000
    }))

    this.addEventListener('peer:discovery', evt => {
      if (!this.isStarted()) {
        return
      }

      autoDialer.handle(evt)
    })

    // Discovery modules
    for (const service of init.peerDiscovery ?? []) {
      this.configureComponent(service)

      service.addEventListener('peer', (evt) => {
        this.onDiscoveryPeer(evt)
      })
    }
  }

  private configureComponent <T> (component: T): T {
    if (isStartable(component)) {
      this.services.push(component)
    }

    if (isInitializable(component)) {
      this.initializables.push(component)
    }

    return component
  }

  /**
   * Starts the libp2p node and all its subsystems
   */
  async start () {
    if (this.started) {
      return
    }

    this.started = true

    log('libp2p is starting')

    try {
      // Set available components on all modules interested in components
      this.initializables.forEach(obj => {
        obj.init(this.components)
      })

      await Promise.all(
        this.services.map(async service => {
          if (service.beforeStart != null) {
            await service.beforeStart()
          }
        })
      )

      // start any startables
      await Promise.all(
        this.services.map(service => service.start())
      )

      await Promise.all(
        this.services.map(async service => {
          if (service.afterStart != null) {
            await service.afterStart()
          }
        })
      )

      log('libp2p has started')
    } catch (err: any) {
      log.error('An error occurred starting libp2p', err)
      await this.stop()
      throw err
    }
  }

  /**
   * Stop the libp2p node by closing its listeners and open connections
   */
  async stop () {
    if (!this.started) {
      return
    }

    log('libp2p is stopping')

    this.started = false

    await Promise.all(
      this.services.map(async service => {
        if (service.beforeStop != null) {
          await service.beforeStop()
        }
      })
    )

    await Promise.all(
      this.services.map(service => service.stop())
    )

    await Promise.all(
      this.services.map(async service => {
        if (service.afterStop != null) {
          await service.afterStop()
        }
      })
    )

    log('libp2p has stopped')
  }

  isStarted () {
    return this.started
  }

  getConnections (peerId?: PeerId): Connection[] {
    return this.components.getConnectionManager().getConnections(peerId)
  }

  getPeers (): PeerId[] {
    const peerSet = new PeerSet()

    for (const conn of this.components.getConnectionManager().getConnections()) {
      peerSet.add(conn.remotePeer)
    }

    return Array.from(peerSet)
  }

  async dial (peer: PeerId | Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    const { id, multiaddrs } = getPeer(peer)

    await this.components.getPeerStore().addressBook.add(id, multiaddrs)

    return await this.components.getConnectionManager().openConnection(id, options)
  }

  async dialProtocol (peer: PeerId | Multiaddr, protocols: string | string[], options: AbortOptions = {}) {
    if (protocols == null) {
      throw errCode(new Error('no protocols were provided to open a stream'), codes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
    }

    protocols = Array.isArray(protocols) ? protocols : [protocols]

    if (protocols.length === 0) {
      throw errCode(new Error('no protocols were provided to open a stream'), codes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
    }

    const connection = await this.dial(peer, options)

    return await connection.newStream(protocols, options)
  }

  getMultiaddrs (): Multiaddr[] {
    return this.components.getAddressManager().getAddresses()
  }

  async hangUp (peer: PeerId | Multiaddr | string): Promise<void> {
    const { id } = getPeer(peer)

    await this.components.getConnectionManager().closeConnections(id)
  }

  /**
   * Get the public key for the given peer id
   */
  async getPublicKey (peer: PeerId, options: AbortOptions = {}): Promise<Uint8Array> {
    log('getPublicKey %p', peer)

    if (peer.publicKey != null) {
      return peer.publicKey
    }

    const peerInfo = await this.peerStore.get(peer)

    if (peerInfo.pubKey != null) {
      return peerInfo.pubKey
    }

    if (this.dht == null) {
      throw errCode(new Error('Public key was not in the peer store and the DHT is not enabled'), codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    const peerKey = uint8ArrayConcat([
      uint8ArrayFromString('/pk/'),
      peer.multihash.digest
    ])

    // search the dht
    for await (const event of this.dht.get(peerKey, options)) {
      if (event.name === 'VALUE') {
        const key = unmarshalPublicKey(event.value)

        await this.peerStore.keyBook.set(peer, event.value)

        return key.bytes
      }
    }

    throw errCode(new Error(`Node not responding with its public key: ${peer.toString()}`), codes.ERR_INVALID_RECORD)
  }

  async fetch (peer: PeerId | Multiaddr | string, key: string, options: AbortOptions = {}): Promise<Uint8Array | null> {
    const { id, multiaddrs } = getPeer(peer)

    if (multiaddrs != null) {
      await this.components.getPeerStore().addressBook.add(id, multiaddrs)
    }

    return await this.fetchService.fetch(id, key, options)
  }

  async ping (peer: PeerId | Multiaddr | string, options: AbortOptions = {}): Promise<number> {
    const { id, multiaddrs } = getPeer(peer)

    if (multiaddrs.length > 0) {
      await this.components.getPeerStore().addressBook.add(id, multiaddrs)
    }

    return await this.pingService.ping(id, options)
  }

  async handle (protocols: string | string[], handler: StreamHandler, options?: StreamHandlerOptions): Promise<void> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    await Promise.all(
      protocols.map(async protocol => {
        await this.components.getRegistrar().handle(protocol, handler, options)
      })
    )
  }

  async unhandle (protocols: string[] | string): Promise<void> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    await Promise.all(
      protocols.map(async protocol => {
        await this.components.getRegistrar().unhandle(protocol)
      })
    )
  }

  /**
   * Called whenever peer discovery services emit `peer` events.
   * Known peers may be emitted.
   */
  onDiscoveryPeer (evt: CustomEvent<PeerInfo>) {
    const { detail: peer } = evt

    if (peer.id.toString() === this.peerId.toString()) {
      log.error(new Error(codes.ERR_DISCOVERED_SELF))
      return
    }

    if (peer.multiaddrs.length > 0) {
      void this.components.getPeerStore().addressBook.add(peer.id, peer.multiaddrs).catch(err => log.error(err))
    }

    if (peer.protocols.length > 0) {
      void this.components.getPeerStore().protoBook.set(peer.id, peer.protocols).catch(err => log.error(err))
    }

    this.dispatchEvent(new CustomEvent<PeerInfo>('peer:discovery', { detail: peer }))
  }
}

/**
 * Returns a new Libp2pNode instance - this exposes more of the internals than the
 * libp2p interface and is useful for testing and debugging.
 */
export async function createLibp2pNode (options: Libp2pOptions): Promise<Libp2pNode> {
  if (options.peerId == null) {
    options.peerId = await createEd25519PeerId()
  }

  return new Libp2pNode(validateConfig(options))
}

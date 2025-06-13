import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { contentRoutingSymbol, peerDiscoverySymbol, peerRoutingSymbol, InvalidParametersError } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import { peerIdFromString } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { isMultiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core/memory'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { AddressManager } from './address-manager/index.js'
import { checkServiceDependencies, defaultComponents } from './components.js'
import { connectionGater } from './config/connection-gater.js'
import { DefaultConnectionManager } from './connection-manager/index.js'
import { ConnectionMonitor } from './connection-monitor.js'
import { CompoundContentRouting } from './content-routing.js'
import { DefaultPeerRouting } from './peer-routing.js'
import { RandomWalk } from './random-walk.js'
import { Registrar } from './registrar.js'
import { DefaultTransportManager } from './transport-manager.js'
import { Upgrader } from './upgrader.js'
import { userAgent } from './user-agent.js'
import * as pkg from './version.js'
import type { Components } from './components.js'
import type { Libp2p as Libp2pInterface, Libp2pInit } from './index.js'
import type { PeerRouting, ContentRouting, Libp2pEvents, PendingDial, ServiceMap, AbortOptions, ComponentLogger, Logger, Connection, NewStreamOptions, Stream, Metrics, PeerId, PeerInfo, PeerStore, Topology, Libp2pStatus, IsDialableOptions, DialOptions, PublicKey, Ed25519PeerId, Secp256k1PeerId, RSAPublicKey, RSAPeerId, URLPeerId, Ed25519PublicKey, Secp256k1PublicKey, StreamHandler, StreamHandlerOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class Libp2p<T extends ServiceMap = ServiceMap> extends TypedEventEmitter<Libp2pEvents> implements Libp2pInterface<T> {
  public peerId: PeerId
  public peerStore: PeerStore
  public contentRouting: ContentRouting
  public peerRouting: PeerRouting
  public metrics?: Metrics
  public services: T
  public logger: ComponentLogger
  public status: Libp2pStatus

  public components: Components & T
  private readonly log: Logger

  // eslint-disable-next-line complexity
  constructor (init: Libp2pInit<T> & { peerId: PeerId }) {
    super()

    this.status = 'stopped'

    // event bus - components can listen to this emitter to be notified of system events
    // and also cause them to be emitted
    const events = new TypedEventEmitter<Libp2pEvents>()
    const originalDispatch = events.dispatchEvent.bind(events)
    events.dispatchEvent = (evt: any) => {
      const internalResult = originalDispatch(evt)
      const externalResult = this.dispatchEvent(
        new CustomEvent(evt.type, { detail: evt.detail })
      )

      return internalResult || externalResult
    }

    // This emitter gets listened to a lot
    setMaxListeners(Infinity, events)

    this.peerId = init.peerId
    this.logger = init.logger ?? defaultLogger()
    this.log = this.logger.forComponent('libp2p')
    // @ts-expect-error {} may not be of type T
    this.services = {}

    const nodeInfoName = init.nodeInfo?.name ?? pkg.name
    const nodeInfoVersion = init.nodeInfo?.version ?? pkg.version

    // @ts-expect-error defaultComponents is missing component types added later
    const components = this.components = defaultComponents({
      peerId: init.peerId,
      privateKey: init.privateKey,
      nodeInfo: {
        name: nodeInfoName,
        version: nodeInfoVersion,
        userAgent: init.nodeInfo?.userAgent ?? userAgent(nodeInfoName, nodeInfoVersion)
      },
      logger: this.logger,
      events,
      datastore: init.datastore ?? new MemoryDatastore(),
      connectionGater: connectionGater(init.connectionGater),
      dns: init.dns
    })

    // Create Metrics
    if (init.metrics != null) {
      this.metrics = this.configureComponent('metrics', init.metrics(this.components))
    }

    this.peerStore = this.configureComponent('peerStore', persistentPeerStore(components, {
      addressFilter: this.components.connectionGater.filterMultiaddrForPeer,
      ...init.peerStore
    }))

    components.events.addEventListener('peer:update', evt => {
      // if there was no peer previously in the peer store this is a new peer
      if (evt.detail.previous == null) {
        const peerInfo: PeerInfo = {
          id: evt.detail.peer.id,
          multiaddrs: evt.detail.peer.addresses.map(a => a.multiaddr)
        }

        components.events.safeDispatchEvent('peer:discovery', { detail: peerInfo })
      }
    })

    // Set up connection protector if configured
    if (init.connectionProtector != null) {
      this.configureComponent('connectionProtector', init.connectionProtector(components))
    }

    // Set up the Upgrader
    this.components.upgrader = new Upgrader(this.components, {
      connectionEncrypters: (init.connectionEncrypters ?? []).map((fn, index) => this.configureComponent(`connection-encryption-${index}`, fn(this.components))),
      streamMuxers: (init.streamMuxers ?? []).map((fn, index) => this.configureComponent(`stream-muxers-${index}`, fn(this.components))),
      inboundUpgradeTimeout: init.connectionManager?.inboundUpgradeTimeout,
      inboundStreamProtocolNegotiationTimeout: init.connectionManager?.inboundStreamProtocolNegotiationTimeout ?? init.connectionManager?.protocolNegotiationTimeout,
      outboundStreamProtocolNegotiationTimeout: init.connectionManager?.outboundStreamProtocolNegotiationTimeout ?? init.connectionManager?.protocolNegotiationTimeout
    })

    // Setup the transport manager
    this.configureComponent('transportManager', new DefaultTransportManager(this.components, init.transportManager))

    // Create the Connection Manager
    this.configureComponent('connectionManager', new DefaultConnectionManager(this.components, init.connectionManager))

    if (init.connectionMonitor?.enabled !== false) {
      // Create the Connection Monitor if not disabled
      this.configureComponent('connectionMonitor', new ConnectionMonitor(this.components, init.connectionMonitor))
    }

    // Create the Registrar
    this.configureComponent('registrar', new Registrar(this.components))

    // Addresses {listen, announce, noAnnounce}
    this.configureComponent('addressManager', new AddressManager(this.components, init.addresses))

    // Peer routers
    const peerRouters: PeerRouting[] = (init.peerRouters ?? []).map((fn, index) => this.configureComponent(`peer-router-${index}`, fn(this.components)))
    this.peerRouting = this.components.peerRouting = this.configureComponent('peerRouting', new DefaultPeerRouting(this.components, {
      routers: peerRouters
    }))

    // Content routers
    const contentRouters: ContentRouting[] = (init.contentRouters ?? []).map((fn, index) => this.configureComponent(`content-router-${index}`, fn(this.components)))
    this.contentRouting = this.components.contentRouting = this.configureComponent('contentRouting', new CompoundContentRouting(this.components, {
      routers: contentRouters
    }))

    // Random walk
    this.configureComponent('randomWalk', new RandomWalk(this.components))

    // Discovery modules
    ;(init.peerDiscovery ?? []).forEach((fn, index) => {
      const service = this.configureComponent(`peer-discovery-${index}`, fn(this.components))

      service.addEventListener('peer', (evt) => {
        this.#onDiscoveryPeer(evt)
      })
    })

    // Transport modules
    init.transports?.forEach((fn, index) => {
      this.components.transportManager.add(this.configureComponent(`transport-${index}`, fn(this.components)))
    })

    // User defined modules
    if (init.services != null) {
      for (const name of Object.keys(init.services)) {
        const createService = init.services[name]
        const service: any = createService(this.components)

        if (service == null) {
          this.log.error('service factory %s returned null or undefined instance', name)
          continue
        }

        this.services[name as keyof T] = service
        this.configureComponent(name, service)

        if (service[contentRoutingSymbol] != null) {
          this.log('registering service %s for content routing', name)
          contentRouters.push(service[contentRoutingSymbol])
        }

        if (service[peerRoutingSymbol] != null) {
          this.log('registering service %s for peer routing', name)
          peerRouters.push(service[peerRoutingSymbol])
        }

        if (service[peerDiscoverySymbol] != null) {
          this.log('registering service %s for peer discovery', name)
          service[peerDiscoverySymbol].addEventListener?.('peer', (evt: CustomEvent<PeerInfo>) => {
            this.#onDiscoveryPeer(evt)
          })
        }
      }
    }

    // Ensure all services have their required dependencies
    checkServiceDependencies(components)
  }

  private configureComponent <T> (name: string, component: T): T {
    if (component == null) {
      this.log.error('component %s was null or undefined', name)
    }

    // @ts-expect-error cannot assign props
    this.components[name] = component

    return component
  }

  /**
   * Starts the libp2p node and all its subsystems
   */
  async start (): Promise<void> {
    if (this.status !== 'stopped') {
      return
    }

    this.status = 'starting'

    this.log('libp2p is starting')

    try {
      await this.components.beforeStart?.()
      await this.components.start()
      await this.components.afterStart?.()

      this.status = 'started'
      this.safeDispatchEvent('start', { detail: this })
      this.log('libp2p has started')
    } catch (err: any) {
      this.log.error('An error occurred starting libp2p', err)
      // set status to 'started' so this.stop() will stop any running components
      this.status = 'started'
      await this.stop()
      throw err
    }
  }

  /**
   * Stop the libp2p node by closing its listeners and open connections
   */
  async stop (): Promise<void> {
    if (this.status !== 'started') {
      return
    }

    this.log('libp2p is stopping')

    this.status = 'stopping'

    await this.components.beforeStop?.()
    await this.components.stop()
    await this.components.afterStop?.()

    this.status = 'stopped'
    this.safeDispatchEvent('stop', { detail: this })
    this.log('libp2p has stopped')
  }

  getConnections (peerId?: PeerId): Connection[] {
    return this.components.connectionManager.getConnections(peerId)
  }

  getDialQueue (): PendingDial[] {
    return this.components.connectionManager.getDialQueue()
  }

  getPeers (): PeerId[] {
    const peerSet = new PeerSet()

    for (const conn of this.components.connectionManager.getConnections()) {
      peerSet.add(conn.remotePeer)
    }

    return Array.from(peerSet)
  }

  async dial (peer: PeerId | Multiaddr | Multiaddr[], options: DialOptions = {}): Promise<Connection> {
    return this.components.connectionManager.openConnection(peer, {
      // ensure any userland dials take top priority in the queue
      priority: 75,
      ...options
    })
  }

  async dialProtocol (peer: PeerId | Multiaddr | Multiaddr[], protocols: string | string[], options: NewStreamOptions = {}): Promise<Stream> {
    if (protocols == null) {
      throw new InvalidParametersError('no protocols were provided to open a stream')
    }

    protocols = Array.isArray(protocols) ? protocols : [protocols]

    if (protocols.length === 0) {
      throw new InvalidParametersError('no protocols were provided to open a stream')
    }

    const connection = await this.dial(peer, options)

    return connection.newStream(protocols, options)
  }

  getMultiaddrs (): Multiaddr[] {
    return this.components.addressManager.getAddresses()
  }

  getProtocols (): string[] {
    return this.components.registrar.getProtocols()
  }

  async hangUp (peer: PeerId | Multiaddr, options: AbortOptions = {}): Promise<void> {
    if (isMultiaddr(peer)) {
      peer = peerIdFromString(peer.getPeerId() ?? '')
    }

    await this.components.connectionManager.closeConnections(peer, options)
  }

  /**
   * Get the public key for the given peer id
   */
  async getPublicKey (peer: Ed25519PeerId, options?: AbortOptions): Promise<Ed25519PublicKey>
  async getPublicKey (peer: Secp256k1PeerId, options?: AbortOptions): Promise<Secp256k1PublicKey>
  async getPublicKey (peer: RSAPeerId, options?: AbortOptions): Promise<RSAPublicKey>
  async getPublicKey (peer: URLPeerId, options?: AbortOptions): Promise<never>
  async getPublicKey (peer: PeerId, options?: AbortOptions): Promise<PublicKey>
  async getPublicKey (peer: PeerId, options: AbortOptions = {}): Promise<PublicKey> {
    this.log('getPublicKey %p', peer)

    if (peer.publicKey != null) {
      return peer.publicKey
    }

    try {
      const peerInfo = await this.peerStore.get(peer, options)

      if (peerInfo.id.publicKey != null) {
        return peerInfo.id.publicKey
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    const peerKey = uint8ArrayConcat([
      uint8ArrayFromString('/pk/'),
      peer.toMultihash().bytes
    ])

    // search any available content routing methods
    const bytes = await this.contentRouting.get(peerKey, options)

    // ensure the returned key is valid
    const publicKey = publicKeyFromProtobuf(bytes)

    await this.peerStore.patch(peer, {
      publicKey
    }, options)

    return publicKey
  }

  async handle (protocols: string | string[], handler: StreamHandler, options?: StreamHandlerOptions): Promise<void> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    await Promise.all(
      protocols.map(async protocol => {
        await this.components.registrar.handle(protocol, handler, options)
      })
    )
  }

  async unhandle (protocols: string[] | string, options?: AbortOptions): Promise<void> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    await Promise.all(
      protocols.map(async protocol => {
        await this.components.registrar.unhandle(protocol, options)
      })
    )
  }

  async register (protocol: string, topology: Topology, options?: AbortOptions): Promise<string> {
    return this.components.registrar.register(protocol, topology, options)
  }

  unregister (id: string): void {
    this.components.registrar.unregister(id)
  }

  async isDialable (multiaddr: Multiaddr, options: IsDialableOptions = {}): Promise<boolean> {
    return this.components.connectionManager.isDialable(multiaddr, options)
  }

  /**
   * Called whenever peer discovery services emit `peer` events and adds peers
   * to the peer store.
   */
  #onDiscoveryPeer (evt: CustomEvent<PeerInfo>): void {
    const { detail: peer } = evt

    if (peer.id.toString() === this.peerId.toString()) {
      this.log.error('peer discovery mechanism discovered self')
      return
    }

    void this.components.peerStore.merge(peer.id, {
      multiaddrs: peer.multiaddrs
    })
      .catch(err => { this.log.error(err) })
  }
}

import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interfaces'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import { isMultiaddr, Multiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core/memory'
import { DefaultPeerRouting } from './peer-routing.js'
import { CompoundContentRouting } from './content-routing/index.js'
import { codes } from './errors.js'
import { DefaultAddressManager } from './address-manager/index.js'
import { DefaultConnectionManager } from './connection-manager/index.js'
import { DefaultKeyChain } from '@libp2p/keychain'
import { DefaultTransportManager } from './transport-manager.js'
import { DefaultUpgrader } from './upgrader.js'
import { DefaultRegistrar } from './registrar.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { defaultComponents } from './components.js'
import type { Components } from './components.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { StreamHandler, StreamHandlerOptions, Topology } from '@libp2p/interface-registrar'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Libp2p, Libp2pInit, Libp2pOptions } from './index.js'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CodeError } from '@libp2p/interfaces/errors'
import type { Metrics } from '@libp2p/interface-metrics'
import { PeerSet } from '@libp2p/peer-collections'
import type { KeyChain } from '@libp2p/interface-keychain'
import type { Libp2pEvents, PendingDial, ServiceMap } from '@libp2p/interface-libp2p'
import { setMaxListeners } from 'events'
import { unmarshalPublicKey } from '@libp2p/crypto/keys'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Datastore } from 'interface-datastore'
import mergeOptions from 'merge-options'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { validateConfig } from './config.js'
import { ContentRouting, contentRouting } from '@libp2p/interface-content-routing'
import { PeerRouting, peerRouting } from '@libp2p/interface-peer-routing'
import { peerDiscovery } from '@libp2p/interface-peer-discovery'

const log = logger('libp2p')

export class Libp2pNode<T extends ServiceMap = {}> extends EventEmitter<Libp2pEvents> implements Libp2p<T> {
  public peerId: PeerId
  public peerStore: PeerStore
  public contentRouting: ContentRouting
  public peerRouting: PeerRouting
  public keychain: KeyChain
  public metrics?: Metrics
  public services: T

  public components: Components
  #started: boolean

  constructor (init: Libp2pInit<T>) {
    super()

    // event bus - components can listen to this emitter to be notified of system events
    // and also cause them to be emitted
    const events = new EventEmitter<Libp2pEvents>()
    const originalDispatch = events.dispatchEvent.bind(events)
    events.dispatchEvent = (evt: any) => {
      const internalResult = originalDispatch(evt)
      const externalResult = this.dispatchEvent(
        new CustomEvent(evt.type, { detail: evt.detail })
      )

      return internalResult || externalResult
    }

    try {
      // This emitter gets listened to a lot
      setMaxListeners?.(Infinity, events)
    } catch {}

    this.#started = false
    this.peerId = init.peerId
    // @ts-expect-error {} may not be of type T
    this.services = {}
    const components = this.components = defaultComponents({
      peerId: init.peerId,
      events,
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

    this.peerStore = this.configureComponent('peerStore', new PersistentPeerStore(components, {
      addressFilter: this.components.connectionGater.filterMultiaddrForPeer,
      ...init.peerStore
    }))

    // Create Metrics
    if (init.metrics != null) {
      this.metrics = this.configureComponent('metrics', init.metrics(this.components))
    }

    components.events.addEventListener('peer:update', evt => {
      // if there was no peer previously in the peer store this is a new peer
      if (evt.detail.previous == null) {
        this.safeDispatchEvent('peer:discovery', { detail: evt.detail.peer })
      }
    })

    // Set up connection protector if configured
    if (init.connectionProtector != null) {
      this.configureComponent('connectionProtector', init.connectionProtector(components))
    }

    // Set up the Upgrader
    this.components.upgrader = new DefaultUpgrader(this.components, {
      connectionEncryption: (init.connectionEncryption ?? []).map((fn, index) => this.configureComponent(`connection-encryption-${index}`, fn(this.components))),
      muxers: (init.streamMuxers ?? []).map((fn, index) => this.configureComponent(`stream-muxers-${index}`, fn(this.components))),
      inboundUpgradeTimeout: init.connectionManager.inboundUpgradeTimeout
    })

    // Setup the transport manager
    this.configureComponent('transportManager', new DefaultTransportManager(this.components, init.transportManager))

    // Create the Connection Manager
    this.configureComponent('connectionManager', new DefaultConnectionManager(this.components, init.connectionManager))

    // Create the Registrar
    this.configureComponent('registrar', new DefaultRegistrar(this.components))

    // Addresses {listen, announce, noAnnounce}
    this.configureComponent('addressManager', new DefaultAddressManager(this.components, init.addresses))

    // Create keychain
    const keychainOpts = DefaultKeyChain.generateOptions()
    this.keychain = this.configureComponent('keyChain', new DefaultKeyChain(this.components, {
      ...keychainOpts,
      ...init.keychain
    }))

    // Peer routers
    const peerRouters: PeerRouting[] = (init.peerRouters ?? []).map((fn, index) => this.configureComponent(`peer-router-${index}`, fn(this.components)))
    this.peerRouting = this.components.peerRouting = this.configureComponent('peerRouting', new DefaultPeerRouting(this.components, {
      ...init.peerRouting,
      routers: peerRouters
    }))

    // Content routers
    const contentRouters: ContentRouting[] = (init.contentRouters ?? []).map((fn, index) => this.configureComponent(`content-router-${index}`, fn(this.components)))
    this.contentRouting = this.components.contentRouting = this.configureComponent('contentRouting', new CompoundContentRouting(this.components, {
      routers: contentRouters
    }))

    // Discovery modules
    ;(init.peerDiscovery ?? []).forEach((fn, index) => {
      const service = this.configureComponent(`peer-discovery-${index}`, fn(this.components))

      service.addEventListener('peer', (evt) => {
        this.#onDiscoveryPeer(evt)
      })
    })

    // Transport modules
    init.transports.forEach((fn, index) => {
      this.components.transportManager.add(this.configureComponent(`transport-${index}`, fn(this.components)))
    })

    // User defined modules
    if (init.services != null) {
      for (const name of Object.keys(init.services)) {
        const createService = init.services[name]
        const service: any = createService(this.components)

        if (service == null) {
          continue
        }

        this.services[name as keyof T] = service
        this.configureComponent(name, service)

        if (service == null) {
          throw new Error('wtf ' + name)
        }

        if (service[contentRouting] != null) {
          log('registering service %s for content routing', name)
          contentRouters.push(service[contentRouting])
        }

        if (service[peerRouting] != null) {
          log('registering service %s for peer routing', name)
          peerRouters.push(service[peerRouting])
        }

        if (service[peerDiscovery] != null) {
          log('registering service %s for peer discovery', name)
          service[peerDiscovery].addEventListener('peer', (evt: CustomEvent<PeerInfo>) => {
            this.#onDiscoveryPeer(evt)
          })
        }
      }
    }
  }

  private configureComponent <T> (name: string, component: T): T {
    this.components[name] = component

    return component
  }

  /**
   * Starts the libp2p node and all its subsystems
   */
  async start (): Promise<void> {
    if (this.#started) {
      return
    }

    this.#started = true

    log('libp2p is starting')

    const keys = await this.keychain.listKeys()

    if (keys.find(key => key.name === 'self') == null) {
      log('importing self key into keychain')
      await this.keychain.importPeer('self', this.components.peerId)
    }

    try {
      await this.components.beforeStart?.()
      await this.components.start()
      await this.components.afterStart?.()
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
  async stop (): Promise<void> {
    if (!this.#started) {
      return
    }

    log('libp2p is stopping')

    this.#started = false

    await this.components.beforeStop?.()
    await this.components.stop()
    await this.components.afterStop?.()

    log('libp2p has stopped')
  }

  isStarted (): boolean {
    return this.#started
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

  async dial (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<Connection> {
    return await this.components.connectionManager.openConnection(peer, options)
  }

  async dialProtocol (peer: PeerId | Multiaddr | Multiaddr[], protocols: string | string[], options: AbortOptions = {}): Promise<Stream> {
    if (protocols == null) {
      throw new CodeError('no protocols were provided to open a stream', codes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
    }

    protocols = Array.isArray(protocols) ? protocols : [protocols]

    if (protocols.length === 0) {
      throw new CodeError('no protocols were provided to open a stream', codes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
    }

    const connection = await this.dial(peer, options)

    return await connection.newStream(protocols, options)
  }

  getMultiaddrs (): Multiaddr[] {
    return this.components.addressManager.getAddresses()
  }

  getProtocols (): string[] {
    return this.components.registrar.getProtocols()
  }

  async hangUp (peer: PeerId | Multiaddr): Promise<void> {
    if (isMultiaddr(peer)) {
      peer = peerIdFromString(peer.getPeerId() ?? '')
    }

    await this.components.connectionManager.closeConnections(peer)
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

    if (peerInfo.id.publicKey != null) {
      return peerInfo.id.publicKey
    }

    const peerKey = uint8ArrayConcat([
      uint8ArrayFromString('/pk/'),
      peer.multihash.digest
    ])

    // search any available content routing methods
    const bytes = await this.contentRouting.get(peerKey, options)
    // ensure the returned key is valid
    unmarshalPublicKey(bytes)

    await this.peerStore.patch(peer, {
      publicKey: bytes
    })

    return bytes
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

  async unhandle (protocols: string[] | string): Promise<void> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    await Promise.all(
      protocols.map(async protocol => {
        await this.components.registrar.unhandle(protocol)
      })
    )
  }

  async register (protocol: string, topology: Topology): Promise<string> {
    return await this.components.registrar.register(protocol, topology)
  }

  unregister (id: string): void {
    this.components.registrar.unregister(id)
  }

  /**
   * Called whenever peer discovery services emit `peer` events and adds peers
   * to the peer store.
   */
  #onDiscoveryPeer (evt: CustomEvent<PeerInfo>): void {
    const { detail: peer } = evt

    if (peer.id.toString() === this.peerId.toString()) {
      log.error(new Error(codes.ERR_DISCOVERED_SELF))
      return
    }

    void this.components.peerStore.merge(peer.id, {
      multiaddrs: peer.multiaddrs,
      protocols: peer.protocols
    })
      .catch(err => { log.error(err) })
  }
}

/**
 * Returns a new Libp2pNode instance - this exposes more of the internals than the
 * libp2p interface and is useful for testing and debugging.
 */
export async function createLibp2pNode <T extends ServiceMap = {}> (options: Libp2pOptions<T>): Promise<Libp2pNode<T>> {
  if (options.peerId == null) {
    const datastore = options.datastore as Datastore | undefined

    if (datastore != null) {
      try {
        // try load the peer id from the keychain
        const keyChain = new DefaultKeyChain({
          datastore
        }, mergeOptions(DefaultKeyChain.generateOptions(), options.keychain))

        options.peerId = await keyChain.exportPeerId('self')
      } catch (err: any) {
        if (err.code !== 'ERR_NOT_FOUND') {
          throw err
        }
      }
    }
  }

  if (options.peerId == null) {
    // no peer id in the keychain, create a new peer id
    options.peerId = await createEd25519PeerId()
  }

  return new Libp2pNode(validateConfig(options))
}

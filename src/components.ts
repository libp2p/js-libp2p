import errCode from 'err-code'
import type { ConnectionGater, ConnectionProtector } from '@libp2p/interface-connection'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { isStartable, Startable } from '@libp2p/interfaces/startable'
import type { Metrics } from '@libp2p/interface-metrics'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Registrar } from '@libp2p/interface-registrar'
import type { TransportManager, Upgrader } from '@libp2p/interface-transport'
import type { Datastore } from 'interface-datastore'
import type { PubSub } from '@libp2p/interface-pubsub'
import type { DualDHT } from '@libp2p/interface-dht'
import type { ConnectionManager, Dialer } from '@libp2p/interface-connection-manager'

export interface Components {
  peerId: PeerId
  addressManager: AddressManager
  peerStore: PeerStore
  upgrader: Upgrader
  registrar: Registrar
  connectionManager: ConnectionManager
  transportManager: TransportManager
  connectionGater: ConnectionGater
  contentRouting: ContentRouting
  peerRouting: PeerRouting
  datastore: Datastore
  connectionProtector?: ConnectionProtector
  dialer: Dialer
  metrics?: Metrics
  dht?: DualDHT
  pubsub?: PubSub
}

export interface ComponentsInit {
  peerId?: PeerId
  addressManager?: AddressManager
  peerStore?: PeerStore
  upgrader?: Upgrader
  metrics?: Metrics
  registrar?: Registrar
  connectionManager?: ConnectionManager
  transportManager?: TransportManager
  connectionGater?: ConnectionGater
  contentRouting?: ContentRouting
  peerRouting?: PeerRouting
  datastore?: Datastore
  connectionProtector?: ConnectionProtector
  dht?: DualDHT
  pubsub?: PubSub
  dialer?: Dialer
}

export class DefaultComponents implements Components, Startable {
  private _peerId?: PeerId
  private _addressManager?: AddressManager
  private _peerStore?: PeerStore
  private _upgrader?: Upgrader
  private _metrics?: Metrics
  private _registrar?: Registrar
  private _connectionManager?: ConnectionManager
  private _transportManager?: TransportManager
  private _connectionGater?: ConnectionGater
  private _contentRouting?: ContentRouting
  private _peerRouting?: PeerRouting
  private _datastore?: Datastore
  private _connectionProtector?: ConnectionProtector
  private _dht?: DualDHT
  private _pubsub?: PubSub
  private _dialer?: Dialer
  private _started = false

  constructor (init: ComponentsInit = {}) {
    this._peerId = init.peerId
    this._addressManager = init.addressManager
    this._peerStore = init.peerStore
    this._upgrader = init.upgrader
    this._metrics = init.metrics
    this._registrar = init.registrar
    this._connectionManager = init.connectionManager
    this._transportManager = init.transportManager
    this._connectionGater = init.connectionGater
    this._contentRouting = init.contentRouting
    this._peerRouting = init.peerRouting
    this._datastore = init.datastore
    this._connectionProtector = init.connectionProtector
    this._dht = init.dht
    this._pubsub = init.pubsub
    this._dialer = init.dialer
  }

  isStarted () {
    return this._started
  }

  async beforeStart () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        if (startable.beforeStart != null) {
          await startable.beforeStart()
        }
      })
    )
  }

  async start () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        await startable.start()
      })
    )

    this._started = true
  }

  async afterStart () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        if (startable.afterStart != null) {
          await startable.afterStart()
        }
      })
    )
  }

  async beforeStop () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        if (startable.beforeStop != null) {
          await startable.beforeStop()
        }
      })
    )
  }

  async stop () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        await startable.stop()
      })
    )

    this._started = false
  }

  async afterStop () {
    await Promise.all(
      Object.values(this).filter(obj => isStartable(obj)).map(async (startable: Startable) => {
        if (startable.afterStop != null) {
          await startable.afterStop()
        }
      })
    )
  }

  get peerId (): PeerId {
    if (this._peerId == null) {
      throw errCode(new Error('peerId not set'), 'ERR_SERVICE_MISSING')
    }

    return this._peerId
  }

  set peerId (peerId: PeerId) {
    this._peerId = peerId
  }

  get addressManager (): AddressManager {
    if (this._addressManager == null) {
      throw errCode(new Error('addressManager not set'), 'ERR_SERVICE_MISSING')
    }

    return this._addressManager
  }

  set addressManager (addressManager: AddressManager) {
    this._addressManager = addressManager
  }

  get peerStore (): PeerStore {
    if (this._peerStore == null) {
      throw errCode(new Error('peerStore not set'), 'ERR_SERVICE_MISSING')
    }

    return this._peerStore
  }

  set peerStore (peerStore: PeerStore) {
    this._peerStore = peerStore
  }

  get upgrader (): Upgrader {
    if (this._upgrader == null) {
      throw errCode(new Error('upgrader not set'), 'ERR_SERVICE_MISSING')
    }

    return this._upgrader
  }

  set upgrader (upgrader: Upgrader) {
    this._upgrader = upgrader
  }

  get registrar (): Registrar {
    if (this._registrar == null) {
      throw errCode(new Error('registrar not set'), 'ERR_SERVICE_MISSING')
    }

    return this._registrar
  }

  set registrar (registrar: Registrar) {
    this._registrar = registrar
  }

  get connectionManager (): ConnectionManager {
    if (this._connectionManager == null) {
      throw errCode(new Error('connectionManager not set'), 'ERR_SERVICE_MISSING')
    }

    return this._connectionManager
  }

  set connectionManager (connectionManager: ConnectionManager) {
    this._connectionManager = connectionManager
  }

  get transportManager (): TransportManager {
    if (this._transportManager == null) {
      throw errCode(new Error('transportManager not set'), 'ERR_SERVICE_MISSING')
    }

    return this._transportManager
  }

  set transportManager (transportManager: TransportManager) {
    this._transportManager = transportManager
  }

  get connectionGater (): ConnectionGater {
    if (this._connectionGater == null) {
      throw errCode(new Error('connectionGater not set'), 'ERR_SERVICE_MISSING')
    }

    return this._connectionGater
  }

  set connectionGater (connectionGater: ConnectionGater) {
    this._connectionGater = connectionGater
  }

  get contentRouting (): ContentRouting {
    if (this._contentRouting == null) {
      throw errCode(new Error('contentRouting not set'), 'ERR_SERVICE_MISSING')
    }

    return this._contentRouting
  }

  set contentRouting (contentRouting: ContentRouting) {
    this._contentRouting = contentRouting
  }

  get peerRouting (): PeerRouting {
    if (this._peerRouting == null) {
      throw errCode(new Error('peerRouting not set'), 'ERR_SERVICE_MISSING')
    }

    return this._peerRouting
  }

  set peerRouting (peerRouting: PeerRouting) {
    this._peerRouting = peerRouting
  }

  get datastore (): Datastore {
    if (this._datastore == null) {
      throw errCode(new Error('datastore not set'), 'ERR_SERVICE_MISSING')
    }

    return this._datastore
  }

  set datastore (datastore: Datastore) {
    this._datastore = datastore
  }

  get connectionProtector (): ConnectionProtector | undefined {
    return this._connectionProtector
  }

  set connectionProtector (connectionProtector: ConnectionProtector | undefined) {
    this._connectionProtector = connectionProtector
  }

  get dialer (): Dialer {
    if (this._dialer == null) {
      throw errCode(new Error('dialer not set'), 'ERR_SERVICE_MISSING')
    }

    return this._dialer
  }

  set dialer (dialer: Dialer) {
    this._dialer = dialer
  }

  get metrics (): Metrics | undefined {
    return this._metrics
  }

  set metrics (metrics: Metrics | undefined) {
    this._metrics = metrics
  }

  get dht (): DualDHT | undefined {
    return this._dht
  }

  set dht (dht: DualDHT | undefined) {
    this._dht = dht
  }

  get pubsub (): PubSub | undefined {
    return this._pubsub
  }

  set pubsub (pubsub: PubSub | undefined) {
    this._pubsub = pubsub
  }
}

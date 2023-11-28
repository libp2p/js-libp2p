import { CodeError } from '@libp2p/interface'
import { isStartable, type Startable, type Libp2pEvents, type ComponentLogger, type NodeInfo, type ConnectionProtector, type ConnectionGater, type ContentRouting, type TypedEventTarget, type Metrics, type PeerId, type PeerRouting, type PeerStore, type Upgrader } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import type { AddressManager, ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { Datastore } from 'interface-datastore'

export interface Components extends Record<string, any>, Startable {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
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
  metrics?: Metrics
}

export interface ComponentsInit {
  peerId?: PeerId
  nodeInfo?: NodeInfo
  logger?: ComponentLogger
  events?: TypedEventTarget<Libp2pEvents>
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
}

class DefaultComponents implements Startable {
  public components: Record<string, any> = {}
  private _started = false

  constructor (init: ComponentsInit = {}) {
    this.components = {}

    for (const [key, value] of Object.entries(init)) {
      this.components[key] = value
    }

    if (this.components.logger == null) {
      this.components.logger = defaultLogger()
    }
  }

  isStarted (): boolean {
    return this._started
  }

  private async _invokeStartableMethod (methodName: 'beforeStart' | 'start' | 'afterStart' | 'beforeStop' | 'stop' | 'afterStop'): Promise<void> {
    await Promise.all(
      Object.values(this.components)
        .filter(obj => isStartable(obj))
        .map(async (startable: Startable) => {
          await startable[methodName]?.()
        })
    )
  }

  async beforeStart (): Promise<void> {
    await this._invokeStartableMethod('beforeStart')
  }

  async start (): Promise<void> {
    await this._invokeStartableMethod('start')
    this._started = true
  }

  async afterStart (): Promise<void> {
    await this._invokeStartableMethod('afterStart')
  }

  async beforeStop (): Promise<void> {
    await this._invokeStartableMethod('beforeStop')
  }

  async stop (): Promise<void> {
    await this._invokeStartableMethod('stop')
    this._started = false
  }

  async afterStop (): Promise<void> {
    await this._invokeStartableMethod('afterStop')
  }
}

const OPTIONAL_SERVICES = [
  'metrics',
  'connectionProtector'
]

const NON_SERVICE_PROPERTIES = [
  'components',
  'isStarted',
  'beforeStart',
  'start',
  'afterStart',
  'beforeStop',
  'stop',
  'afterStop',
  'then',
  '_invokeStartableMethod'
]

export function defaultComponents (init: ComponentsInit = {}): Components {
  const components = new DefaultComponents(init)

  const proxy = new Proxy(components, {
    get (target, prop, receiver) {
      if (typeof prop === 'string' && !NON_SERVICE_PROPERTIES.includes(prop)) {
        const service = components.components[prop]

        if (service == null && !OPTIONAL_SERVICES.includes(prop)) {
          throw new CodeError(`${prop} not set`, 'ERR_SERVICE_MISSING')
        }

        return service
      }

      return Reflect.get(target, prop, receiver)
    },

    set (target, prop, value) {
      if (typeof prop === 'string') {
        components.components[prop] = value
      } else {
        Reflect.set(target, prop, value)
      }

      return true
    }
  })

  // @ts-expect-error component keys are proxied
  return proxy
}

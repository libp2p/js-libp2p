import { serviceCapabilities, serviceDependencies, isStartable } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { MissingServiceError, UnmetServiceDependenciesError } from './errors.js'
import type { Startable, Libp2pEvents, ComponentLogger, NodeInfo, ConnectionProtector, ConnectionGater, ContentRouting, Metrics, PeerId, PeerRouting, PeerStore, PrivateKey, Upgrader } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { DNS } from '@multiformats/dns'
import type { Datastore } from 'interface-datastore'
import type { TypedEventTarget } from 'main-event'

export interface Components extends Record<string, any>, Startable {
  peerId: PeerId
  privateKey: PrivateKey
  nodeInfo: NodeInfo
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  addressManager: AddressManager
  peerStore: PeerStore
  upgrader: Upgrader
  randomWalk: RandomWalk
  registrar: Registrar
  connectionManager: ConnectionManager
  transportManager: TransportManager
  connectionGater: ConnectionGater
  contentRouting: ContentRouting
  peerRouting: PeerRouting
  datastore: Datastore
  connectionProtector?: ConnectionProtector
  metrics?: Metrics
  dns?: DNS
}

export interface ComponentsInit {
  peerId?: PeerId
  privateKey?: PrivateKey
  nodeInfo?: NodeInfo
  logger?: ComponentLogger
  events?: TypedEventTarget<Libp2pEvents>
  addressManager?: AddressManager
  peerStore?: PeerStore
  upgrader?: Upgrader
  randomWalk?: RandomWalk
  metrics?: Metrics
  registrar?: Registrar
  connectionManager?: ConnectionManager
  transportManager?: TransportManager
  connectionGater?: ConnectionGater
  contentRouting?: ContentRouting
  peerRouting?: PeerRouting
  datastore?: Datastore
  connectionProtector?: ConnectionProtector
  dns?: DNS
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
  'connectionProtector',
  'dns'
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
          throw new MissingServiceError(`${prop} not set`)
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

export function checkServiceDependencies (components: Components): void {
  const serviceCapabilities: Record<string, ConstrainBoolean> = {}

  for (const service of Object.values(components.components)) {
    for (const capability of getServiceCapabilities(service)) {
      serviceCapabilities[capability] = true
    }
  }

  for (const service of Object.values(components.components)) {
    for (const capability of getServiceDependencies(service)) {
      if (serviceCapabilities[capability] !== true) {
        throw new UnmetServiceDependenciesError(`Service "${getServiceName(service)}" required capability "${capability}" but it was not provided by any component, you may need to add additional configuration when creating your node.`)
      }
    }
  }
}

function getServiceCapabilities (service: any): string[] {
  if (Array.isArray(service?.[serviceCapabilities])) {
    return service[serviceCapabilities]
  }

  return []
}

function getServiceDependencies (service: any): string[] {
  if (Array.isArray(service?.[serviceDependencies])) {
    return service[serviceDependencies]
  }

  return []
}

function getServiceName (service: any): string {
  return service?.[Symbol.toStringTag] ?? service?.toString() ?? 'unknown'
}

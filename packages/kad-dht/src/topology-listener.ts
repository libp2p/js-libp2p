import { TypedEventEmitter } from 'main-event'
import type { KadDHTComponents } from './index.js'
import type { Logger, PeerId, Startable } from '@libp2p/interface'

export interface TopologyListenerInit {
  protocol: string
  logPrefix: string
}

export interface TopologyListenerEvents {
  peer: CustomEvent<PeerId>
}

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class TopologyListener extends TypedEventEmitter<TopologyListenerEvents> implements Startable {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly protocol: string
  private running: boolean
  private registrarId?: string

  constructor (components: KadDHTComponents, init: TopologyListenerInit) {
    super()

    const { protocol, logPrefix } = init

    this.components = components
    this.log = components.logger.forComponent(`${logPrefix}:topology-listener`)
    this.running = false
    this.protocol = protocol
  }

  isStarted (): boolean {
    return this.running
  }

  /**
   * Start the network
   */
  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true

    // register protocol with topology
    this.registrarId = await this.components.registrar.register(this.protocol, {
      onConnect: (peerId) => {
        this.log('observed peer %p with protocol %s', peerId, this.protocol)
        this.dispatchEvent(new CustomEvent('peer', {
          detail: peerId
        }))
      }
    })
  }

  /**
   * Stop all network activity
   */
  async stop (): Promise<void> {
    this.running = false

    // unregister protocol and handlers
    if (this.registrarId != null) {
      this.components.registrar.unregister(this.registrarId)
      this.registrarId = undefined
    }
  }
}

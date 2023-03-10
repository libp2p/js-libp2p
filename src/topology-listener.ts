import { createTopology } from '@libp2p/topology'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { Logger } from '@libp2p/logger'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { KadDHTComponents } from '.'

export interface TopologyListenerInit {
  protocol: string
  lan: boolean
}

export interface TopologyListenerEvents {
  'peer': CustomEvent<PeerId>
}

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class TopologyListener extends EventEmitter<TopologyListenerEvents> implements Startable {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly protocol: string
  private running: boolean
  private registrarId?: string

  constructor (components: KadDHTComponents, init: TopologyListenerInit) {
    super()

    const { protocol, lan } = init

    this.components = components
    this.log = logger(`libp2p:kad-dht:topology-listener:${lan ? 'lan' : 'wan'}`)
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
    const topology = createTopology({
      onConnect: (peerId) => {
        this.log('observed peer %p with protocol %s', peerId, this.protocol)
        this.dispatchEvent(new CustomEvent('peer', {
          detail: peerId
        }))
      }
    })
    this.registrarId = await this.components.registrar.register(this.protocol, topology)
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

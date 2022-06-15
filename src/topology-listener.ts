import { createTopology } from '@libp2p/topology'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { Logger } from '@libp2p/logger'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerId } from '@libp2p/interface-peer-id'
import { Components, Initializable } from '@libp2p/components'

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
export class TopologyListener extends EventEmitter<TopologyListenerEvents> implements Startable, Initializable {
  private readonly log: Logger
  private components: Components = new Components()
  private readonly protocol: string
  private running: boolean
  private registrarId?: string

  constructor (init: TopologyListenerInit) {
    super()

    const { protocol, lan } = init

    this.log = logger(`libp2p:kad-dht:topology-listener:${lan ? 'lan' : 'wan'}`)
    this.running = false
    this.protocol = protocol
  }

  init (components: Components): void {
    this.components = components
  }

  isStarted () {
    return this.running
  }

  /**
   * Start the network
   */
  async start () {
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
    this.registrarId = await this.components.getRegistrar().register(this.protocol, topology)
  }

  /**
   * Stop all network activity
   */
  stop () {
    this.running = false

    // unregister protocol and handlers
    if (this.registrarId != null) {
      this.components.getRegistrar().unregister(this.registrarId)
      this.registrarId = undefined
    }
  }
}

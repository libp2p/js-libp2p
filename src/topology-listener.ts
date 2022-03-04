import { createTopology } from '@libp2p/topology'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces'
import { logger } from '@libp2p/logger'
import type { Registrar } from '@libp2p/interfaces/registrar'
import type { Logger } from '@libp2p/logger'
import type { Startable } from '@libp2p/interfaces'
import type { PeerId } from '@libp2p/interfaces/peer-id'

export interface TopologyListenerOptions {
  registrar: Registrar
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
  private readonly registrar: Registrar
  private readonly protocol: string
  private running: boolean
  private registrarId?: string

  constructor (options: TopologyListenerOptions) {
    super()

    const { registrar, protocol, lan } = options

    this.log = logger(`libp2p:kad-dht:topology-listener:${lan ? 'lan' : 'wan'}`)
    this.running = false
    this.registrar = registrar
    this.protocol = protocol
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
        this.log('observed peer %p with protocol %s', this.protocol, peerId)
        this.dispatchEvent(new CustomEvent('peer', {
          detail: peerId
        }))
      }
    })
    this.registrarId = await this.registrar.register(this.protocol, topology)
  }

  /**
   * Stop all network activity
   */
  stop () {
    this.running = false

    // unregister protocol and handlers
    if (this.registrarId != null) {
      this.registrar.unregister(this.registrarId)
      this.registrarId = undefined
    }
  }
}

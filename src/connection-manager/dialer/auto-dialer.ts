import type { PeerInfo } from '@libp2p/interfaces/peer-info'
import { logger } from '@libp2p/logger'
import type { Components } from '@libp2p/interfaces/components'
import { TimeoutController } from 'timeout-abort-controller'

const log = logger('libp2p:dialer:auto-dialer')

export interface AutoDialerInit {
  enabled: boolean
  minConnections: number
  dialTimeout: number
}

export class AutoDialer {
  private readonly components: Components
  private readonly enabled: boolean
  private readonly minConnections: number
  private readonly dialTimeout: number

  constructor (components: Components, init: AutoDialerInit) {
    this.components = components
    this.enabled = init.enabled
    this.minConnections = init.minConnections
    this.dialTimeout = init.dialTimeout
  }

  public handle (evt: CustomEvent<PeerInfo>) {
    const { detail: peer } = evt

    if (!this.enabled) {
      return
    }

    const connections = this.components.getConnectionManager().getConnections(peer.id)

    // If auto dialing is on and we have no connection to the peer, check if we should dial
    if (connections.length === 0) {
      const minConnections = this.minConnections ?? 0

      const allConnections = this.components.getConnectionManager().getConnections()

      if (minConnections > allConnections.length) {
        log('auto-dialing discovered peer %p with timeout %d', peer.id, this.dialTimeout)

        const controller = new TimeoutController(this.dialTimeout)

        void this.components.getConnectionManager().openConnection(peer.id, {
          signal: controller.signal
        })
          .catch(err => {
            log.error('could not connect to discovered peer %p with %o', peer.id, err)
          })
          .finally(() => {
            controller.clear()
          })
      }
    }
  }
}

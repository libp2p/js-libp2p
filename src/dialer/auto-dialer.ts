import type { PeerInfo } from '@libp2p/interfaces/peer-info'
import { logger } from '@libp2p/logger'
import type { Components } from '@libp2p/interfaces/components'

const log = logger('libp2p:dialer:auto-dialer')

export interface AutoDialerInit {
  enabled: boolean
  minConnections: number
}

export class AutoDialer {
  private readonly components: Components
  private readonly enabled: boolean
  private readonly minConnections: number

  constructor (components: Components, init: AutoDialerInit) {
    this.components = components
    this.enabled = init.enabled
    this.minConnections = init.minConnections
  }

  public handle (evt: CustomEvent<PeerInfo>) {
    const { detail: peer } = evt

    // If auto dialing is on and we have no connection to the peer, check if we should dial
    if (this.enabled && this.components.getConnectionManager().getConnection(peer.id) == null) {
      const minConnections = this.minConnections ?? 0

      if (minConnections > this.components.getConnectionManager().getConnectionList().length) {
        log('auto-dialing discovered peer %p', peer.id)

        void this.components.getDialer().dial(peer.id)
          .catch(err => {
            log.error('could not connect to discovered peer %p with %o', peer.id, err)
          })
      }
    }
  }
}

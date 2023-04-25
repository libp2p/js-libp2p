import { logger } from '@libp2p/logger'
import { namespaceToCid } from '../utils.js'
import {
  RELAY_RENDEZVOUS_NS,
  RELAY_V2_HOP_CODEC
} from '../constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { TransportManager } from '@libp2p/interface-transport'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { Registrar } from '@libp2p/interface-registrar'
import { createTopology } from '@libp2p/topology'

const log = logger('libp2p:circuit-relay:discover-relays')

export interface RelayDiscoveryEvents {
  'relay:discover': CustomEvent<PeerId>
}

export interface RelayDiscoveryComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  transportManager: TransportManager
  contentRouting: ContentRouting
  registrar: Registrar
}

/**
 * ReservationManager automatically makes a circuit v2 reservation on any connected
 * peers that support the circuit v2 HOP protocol.
 */
export class RelayDiscovery extends EventEmitter<RelayDiscoveryEvents> implements Startable {
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly contentRouting: ContentRouting
  private readonly registrar: Registrar
  private started: boolean
  private topologyId?: string

  constructor (components: RelayDiscoveryComponents) {
    super()
    this.started = false
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.contentRouting = components.contentRouting
    this.registrar = components.registrar
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    // register a topology listener for when new peers are encountered
    // that support the hop protocol
    this.topologyId = await this.registrar.register(RELAY_V2_HOP_CODEC, createTopology({
      onConnect: (peerId) => {
        this.safeDispatchEvent('relay:discover', { detail: peerId })
      }
    }))

    void this.discover()
      .catch(err => {
        log.error('error listening on relays', err)
      })

    this.started = true
  }

  stop (): void {
    if (this.topologyId != null) {
      this.registrar.unregister(this.topologyId)
    }

    this.started = false
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays:
   *
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected
   * 2. Dial and try to listen on the peers we know that support hop but are not connected
   * 3. Search the network
   */
  async discover (): Promise<void> {
    log('searching peer store for relays')
    const peers = (await this.peerStore.all())
      // filter by a list of peers supporting RELAY_V2_HOP and ones we are not listening on
      .filter(({ id, protocols }) => protocols.includes(RELAY_V2_HOP_CODEC))
      .sort(() => Math.random() - 0.5)

    for (const peer of peers) {
      log('found relay peer %p in content peer store', peer.id)
      this.safeDispatchEvent('relay:discover', { detail: peer.id })
    }

    log('found %d relay peers in peer store', peers.length)

    try {
      log('searching content routing for relays')
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)

      let found = 0

      for await (const provider of this.contentRouting.findProviders(cid)) {
        if (provider.multiaddrs.length > 0 && !provider.id.equals(this.peerId)) {
          const peerId = provider.id

          found++
          log('found relay peer %p in content routing', peerId)
          await this.peerStore.merge(peerId, {
            multiaddrs: provider.multiaddrs
          })

          this.safeDispatchEvent('relay:discover', { detail: peerId })
        }
      }

      log('found %d relay peers in content routing', found)
    } catch (err: any) {
      log.error('failed when finding relays on the network', err)
    }
  }
}

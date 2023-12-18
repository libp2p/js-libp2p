import { TypedEventEmitter } from '@libp2p/interface'
import {
  RELAY_RENDEZVOUS_NS,
  RELAY_V2_HOP_CODEC
} from '../constants.js'
import { namespaceToCid } from '../utils.js'
import type { ComponentLogger, Logger, ContentRouting, PeerId, PeerStore, Startable } from '@libp2p/interface'
import type { ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'

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
  logger: ComponentLogger
}

/**
 * ReservationManager automatically makes a circuit v2 reservation on any connected
 * peers that support the circuit v2 HOP protocol.
 */
export class RelayDiscovery extends TypedEventEmitter<RelayDiscoveryEvents> implements Startable {
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly contentRouting: ContentRouting
  private readonly registrar: Registrar
  private started: boolean
  private topologyId?: string
  private readonly log: Logger

  constructor (components: RelayDiscoveryComponents) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:discover-relays')
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
    this.topologyId = await this.registrar.register(RELAY_V2_HOP_CODEC, {
      notifyOnTransient: true,
      onConnect: (peerId) => {
        this.safeDispatchEvent('relay:discover', { detail: peerId })
      }
    })

    this.started = true
  }

  afterStart (): void {
    void this.discover()
      .catch(err => {
        this.log.error('error discovering relays', err)
      })
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
    this.log('searching peer store for relays')
    const peers = (await this.peerStore.all({
      filters: [
        // filter by a list of peers supporting RELAY_V2_HOP and ones we are not listening on
        (peer) => {
          return peer.protocols.includes(RELAY_V2_HOP_CODEC)
        }
      ],
      orders: [
        () => Math.random() < 0.5 ? 1 : -1
      ]
    }))

    for (const peer of peers) {
      this.log('found relay peer %p in content peer store', peer.id)
      this.safeDispatchEvent('relay:discover', { detail: peer.id })
    }

    this.log('found %d relay peers in peer store', peers.length)

    try {
      this.log('searching content routing for relays')
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)

      let found = 0

      for await (const provider of this.contentRouting.findProviders(cid)) {
        if (provider.multiaddrs.length > 0 && !provider.id.equals(this.peerId)) {
          const peerId = provider.id

          found++
          await this.peerStore.merge(peerId, {
            multiaddrs: provider.multiaddrs
          })

          this.log('found relay peer %p in content routing', peerId)
          this.safeDispatchEvent('relay:discover', { detail: peerId })
        }
      }

      this.log('found %d relay peers in content routing', found)
    } catch (err: any) {
      this.log.error('failed when finding relays on the network', err)
    }
  }
}

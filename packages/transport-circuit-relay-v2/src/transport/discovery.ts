import { PeerQueue } from '@libp2p/utils/peer-queue'
import { anySignal } from 'any-signal'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import {
  RELAY_V2_HOP_CODEC
} from '../constants.js'
import type { ComponentLogger, Libp2pEvents, Logger, Peer, PeerId, PeerInfo, PeerStore, Startable, TopologyFilter, TypedEventTarget } from '@libp2p/interface'
import type { ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'

export interface RelayDiscoveryEvents {
  'relay:discover': CustomEvent<PeerId>
}

export interface RelayDiscoveryComponents {
  peerStore: PeerStore
  connectionManager: ConnectionManager
  transportManager: TransportManager
  registrar: Registrar
  logger: ComponentLogger
  randomWalk: RandomWalk
  events: TypedEventTarget<Libp2pEvents>
}

export interface RelayDiscoveryInit {
  filter?: TopologyFilter
}

/**
 * ReservationManager automatically makes a circuit v2 reservation on any connected
 * peers that support the circuit v2 HOP protocol.
 */
export class RelayDiscovery extends TypedEventEmitter<RelayDiscoveryEvents> implements Startable {
  private readonly components: RelayDiscoveryComponents
  private started: boolean
  private running: boolean
  private topologyId?: string
  private readonly log: Logger
  private discoveryController: AbortController
  private readonly filter?: TopologyFilter
  private queue?: PeerQueue

  constructor (components: RelayDiscoveryComponents, init: RelayDiscoveryInit = {}) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:discover-relays')
    this.components = components
    this.started = false
    this.running = false
    this.filter = init.filter
    this.discoveryController = new AbortController()
    setMaxListeners(Infinity, this.discoveryController.signal)
    this.dialPeer = this.dialPeer.bind(this)
    this.onPeer = this.onPeer.bind(this)
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    // register a topology listener for when new peers are encountered
    // that support the hop protocol
    this.topologyId = await this.components.registrar.register(RELAY_V2_HOP_CODEC, {
      filter: this.filter,
      onConnect: (peerId) => {
        this.log.trace('discovered relay %p queue (length: %d, active %d)', peerId, this.queue?.size, this.queue?.running)
        this.safeDispatchEvent('relay:discover', { detail: peerId })
      }
    })

    this.started = true
  }

  stop (): void {
    if (this.topologyId != null) {
      this.components.registrar.unregister(this.topologyId)
    }

    if (this.running) {
      this.stopDiscovery()
    }

    this.started = false
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays:
   *
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected to
   * 2. Dial and try to listen on the peers we know that support hop but are not connected
   * 3. Search the network - this requires a peer routing implementation to be configured but will fail gracefully
   * 4. Dial any peers discovered - this covers when no peer routing implementation has been configured but some peer discovery mechanism is also present
   */
  startDiscovery (): void {
    if (this.running) {
      return
    }

    this.log('start discovery')
    this.running = true
    this.discoveryController = new AbortController()
    setMaxListeners(Infinity, this.discoveryController.signal)

    // dial any peer we discover
    this.components.events.addEventListener('peer:discovery', this.onPeer)

    Promise.resolve()
      .then(async () => {
        this.log('searching peer store for relays')

        const peers = (await this.components.peerStore.all({
          filters: [
            // filter by a list of peers supporting RELAY_V2_HOP and ones we are not listening on
            (peer) => {
              return peer.protocols.includes(RELAY_V2_HOP_CODEC)
            }
          ],
          orders: [
            // randomize
            () => Math.random() < 0.5 ? 1 : -1,
            // prefer peers we've connected to in the past
            (a, b) => {
              const lastDialA = getLastDial(a)
              const lastDialB = getLastDial(b)

              if (lastDialA > lastDialB) {
                return -1
              }

              if (lastDialB > lastDialA) {
                return 1
              }

              return 0
            }
          ]
        }))

        for (const peer of peers) {
          this.log.trace('found relay peer %p in peer store', peer.id)
          this.safeDispatchEvent('relay:discover', { detail: peer.id })
        }

        this.log('found %d relay peers in peer store', peers.length)

        // perform random walk and dial peers - after identify has run, the network
        // topology will be notified of new relays
        const queue = this.queue = new PeerQueue({
          concurrency: 5
        })

        this.log('start random walk')

        for await (const peer of this.components.randomWalk.walk({ signal: this.discoveryController.signal })) {
          this.log.trace('found random peer %p', peer.id)

          if (queue.has(peer.id)) {
            this.log.trace('random peer %p was already in queue', peer.id)

            // skip peers already in the queue
            continue
          }

          if (this.components.connectionManager.getConnections(peer.id)?.length > 0) {
            this.log.trace('random peer %p was already connected', peer.id)

            // skip peers we are already connected to
            continue
          }

          if (!(await this.components.connectionManager.isDialable(peer.multiaddrs))) {
            this.log.trace('random peer %p was not dialable', peer.id, peer.multiaddrs.map(ma => ma.toString()))

            // skip peers we can't dial
            continue
          }

          if (queue.queued > 10) {
            this.log.trace('wait for space in queue for %p', peer.id)

            // pause the random walk until there is space in the queue
            await queue.onSizeLessThan(10, {
              signal: this.discoveryController.signal
            })
          }

          this.log('adding random peer %p to dial queue (length: %d, active %d)', peer.id, queue.size, queue.running)

          // dial the peer - this will cause identify to run and our topology to
          // be notified and we'll attempt to create reservations
          queue.add(this.dialPeer, {
            peerId: peer.id,
            signal: this.discoveryController.signal
          })
            .catch(err => {
              this.log.error('error opening connection to random peer %p', peer.id, err)
            })
        }

        this.log('stop random walk')

        await queue.onIdle()
      })
      .catch(err => {
        if (!this.discoveryController.signal.aborted) {
          this.log.error('failed when finding relays on the network', err)
        }
      })
  }

  stopDiscovery (): void {
    this.log('stop discovery')
    this.running = false
    this.discoveryController?.abort()
    this.queue?.clear()

    // stop dialing any peer we discover
    this.components.events.removeEventListener('peer:discovery', this.onPeer)
  }

  onPeer (evt: CustomEvent<PeerInfo>): void {
    this.log.trace('maybe dialing discovered peer %p - %e', evt.detail.id)

    this.maybeDialPeer(evt)
      .catch(err => {
        this.log.trace('error dialing discovered peer %p - %e', evt.detail.id, err)
      })
  }

  async maybeDialPeer (evt: CustomEvent<PeerInfo>): Promise<void> {
    if (this.queue == null) {
      return
    }

    const peerId = evt.detail.id
    const multiaddrs = evt.detail.multiaddrs

    if (this.queue.has(peerId)) {
      this.log.trace('random peer %p was already in queue', peerId)

      // skip peers already in the queue
      return
    }

    if (this.components.connectionManager.getConnections(peerId)?.length > 0) {
      this.log.trace('random peer %p was already connected', peerId)

      // skip peers we are already connected to
      return
    }

    if (!(await this.components.connectionManager.isDialable(multiaddrs))) {
      this.log.trace('random peer %p was not dialable', peerId)

      // skip peers we can't dial
      return
    }

    this.queue?.add(this.dialPeer, {
      peerId: evt.detail.id,
      signal: this.discoveryController.signal
    })
      .catch(err => {
        this.log.error('error opening connection to discovered peer %p', evt.detail.id, err)
      })
  }

  async dialPeer ({ peerId, signal }: { peerId: PeerId, signal?: AbortSignal }): Promise<void> {
    const combinedSignal = anySignal([AbortSignal.timeout(5_000), signal])
    setMaxListeners(Infinity, combinedSignal)

    try {
      await this.components.connectionManager.openConnection(peerId, {
        signal: combinedSignal
      })
    } finally {
      combinedSignal.clear()
    }
  }
}

/**
 * Returns the timestamp of the last time we connected to this peer, if we've
 * not connected to them before return 0
 */
function getLastDial (peer: Peer): number {
  const lastDial = peer.metadata.get('last-dial-success')

  if (lastDial == null) {
    return 0
  }

  return new Date(uint8ArrayToString(lastDial)).getTime()
}

import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { anySignal } from 'any-signal'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import {
  RELAY_V2_HOP_CODEC
} from '../constants.js'
import type { ComponentLogger, Logger, Peer, PeerId, PeerStore, Startable, TopologyFilter } from '@libp2p/interface'
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
}

export interface RelayDiscoveryInit {
  filter?: TopologyFilter
}

/**
 * ReservationManager automatically makes a circuit v2 reservation on any connected
 * peers that support the circuit v2 HOP protocol.
 */
export class RelayDiscovery extends TypedEventEmitter<RelayDiscoveryEvents> implements Startable {
  private readonly peerStore: PeerStore
  private readonly registrar: Registrar
  private readonly connectionManager: ConnectionManager
  private readonly randomWalk: RandomWalk
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
    this.started = false
    this.running = false
    this.peerStore = components.peerStore
    this.registrar = components.registrar
    this.connectionManager = components.connectionManager
    this.randomWalk = components.randomWalk
    this.filter = init.filter
    this.discoveryController = new AbortController()
    setMaxListeners(Infinity, this.discoveryController.signal)
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    // register a topology listener for when new peers are encountered
    // that support the hop protocol
    this.topologyId = await this.registrar.register(RELAY_V2_HOP_CODEC, {
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
      this.registrar.unregister(this.topologyId)
    }

    this.discoveryController?.abort()
    this.started = false
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays:
   *
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected to
   * 2. Dial and try to listen on the peers we know that support hop but are not connected
   * 3. Search the network
   */
  startDiscovery (): void {
    if (this.running) {
      return
    }

    this.log('start discovery')
    this.running = true
    this.discoveryController = new AbortController()
    setMaxListeners(Infinity, this.discoveryController.signal)

    Promise.resolve()
      .then(async () => {
        this.log('searching peer store for relays')

        const peers = (await this.peerStore.all({
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

        for await (const peer of this.randomWalk.walk({ signal: this.discoveryController.signal })) {
          this.log.trace('found random peer %p', peer.id)

          if (queue.has(peer.id)) {
            this.log.trace('random peer %p was already in queue', peer.id)

            // skip peers already in the queue
            continue
          }

          if (this.connectionManager.getConnections(peer.id)?.length > 0) {
            this.log.trace('random peer %p was already connected', peer.id)

            // skip peers we are already connected to
            continue
          }

          if (!(await this.connectionManager.isDialable(peer.multiaddrs))) {
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
          queue.add(async () => {
            const signal = anySignal([this.discoveryController.signal, AbortSignal.timeout(5000)])
            setMaxListeners(Infinity, signal)

            try {
              await this.connectionManager.openConnection(peer.id, { signal })
            } finally {
              signal.clear()
            }
          }, {
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

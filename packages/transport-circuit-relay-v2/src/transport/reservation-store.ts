import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { createBloomFilter } from '@libp2p/utils/filters'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { DEFAULT_MAX_RESERVATION_QUEUE_LENGTH, DEFAULT_RESERVATION_COMPLETION_TIMEOUT, DEFAULT_RESERVATION_CONCURRENCY, KEEP_ALIVE_TAG, RELAY_TAG, RELAY_V2_HOP_CODEC } from '../constants.js'
import { HopMessage, Status } from '../pb/index.js'
import { getExpirationMilliseconds } from '../utils.js'
import type { Reservation } from '../pb/index.js'
import type { TypedEventTarget, Libp2pEvents, AbortOptions, ComponentLogger, Logger, Connection, PeerId, PeerStore, Startable, Metrics, Peer } from '@libp2p/interface'
import type { ConnectionManager, TransportManager } from '@libp2p/interface-internal'
import type { Filter } from '@libp2p/utils/filters'

// allow refreshing a relay reservation if it will expire in the next 10 minutes
const REFRESH_WINDOW = (60 * 1000) * 10

// try to refresh relay reservations 5 minutes before expiry
const REFRESH_TIMEOUT = (60 * 1000) * 5

// minimum duration before which a reservation must not be refreshed
const REFRESH_TIMEOUT_MIN = 30 * 1000

export interface ReservationStoreComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  transportManager: TransportManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  metrics?: Metrics
}

export interface ReservationStoreInit {
  /**
   * Multiple relays may be discovered simultaneously - to prevent listening
   * on too many relays, this value controls how many to attempt to reserve a
   * slot on at once. If set to more than one, we may end up listening on
   * more relays than the `maxReservations` value, but on networks with poor
   * connectivity the user may wish to attempt to reserve on multiple relays
   * simultaneously.
   *
   * @default 1
   */
  reservationConcurrency?: number

  /**
   * How many discovered relays to allow in the reservation store
   */
  discoverRelays?: number

  /**
   * Limit the number of potential relays we will dial
   *
   * @default 100
   */
  maxReservationQueueLength?: number

  /**
   * When creating a reservation it must complete within this number of ms
   *
   * @default 5000
   */
  reservationCompletionTimeout?: number
}

export type RelayType = 'discovered' | 'configured'

interface RelayEntry {
  timeout: ReturnType<typeof setTimeout>
  type: RelayType
  reservation: Reservation

  /**
   * Stores the id of the connection we have to the relay
   */
  connection: string
}

export interface ReservationStoreEvents {
  'relay:not-enough-relays': CustomEvent
  'relay:removed': CustomEvent<PeerId>
  'relay:created-reservation': CustomEvent<PeerId>
}

export class ReservationStore extends TypedEventEmitter<ReservationStoreEvents> implements Startable {
  private readonly peerId: PeerId
  private readonly connectionManager: ConnectionManager
  private readonly transportManager: TransportManager
  private readonly peerStore: PeerStore
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly reserveQueue: PeerQueue
  private readonly reservations: PeerMap<RelayEntry>
  private readonly maxDiscoveredRelays: number
  private readonly maxReservationQueueLength: number
  private readonly reservationCompletionTimeout: number
  private started: boolean
  private readonly log: Logger
  private readonly relayFilter: Filter

  constructor (components: ReservationStoreComponents, init?: ReservationStoreInit) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:transport:reservation-store')
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.transportManager = components.transportManager
    this.peerStore = components.peerStore
    this.events = components.events
    this.reservations = new PeerMap()
    this.maxDiscoveredRelays = init?.discoverRelays ?? 0
    this.maxReservationQueueLength = init?.maxReservationQueueLength ?? DEFAULT_MAX_RESERVATION_QUEUE_LENGTH
    this.reservationCompletionTimeout = init?.reservationCompletionTimeout ?? DEFAULT_RESERVATION_COMPLETION_TIMEOUT
    this.started = false
    this.relayFilter = createBloomFilter(100)

    // ensure we don't listen on multiple relays simultaneously
    this.reserveQueue = new PeerQueue({
      concurrency: init?.reservationConcurrency ?? DEFAULT_RESERVATION_CONCURRENCY,
      metricName: 'libp2p_relay_reservation_queue',
      metrics: components.metrics
    })

    // reservations are only valid while we are still connected to the relay.
    // if we had a reservation opened via that connection, remove it and maybe
    // trigger a search for new relays
    this.events.addEventListener('connection:close', (evt) => {
      const reservation = [...this.reservations.values()]
        .find(reservation => reservation.connection === evt.detail.id)

      if (reservation == null) {
        return
      }

      this.#removeReservation(evt.detail.remotePeer, reservation)
        .catch(err => {
          this.log('could not remove relay %p - %e', evt.detail, err)
        })
    })
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.started = true
  }

  afterStart (): void {
    // remove old relay tags
    void Promise.resolve()
      .then(async () => {
        const relayPeers: Peer[] = await this.peerStore.all({
          filters: [(peer) => {
            return peer.tags.has(RELAY_TAG)
          }]
        })

        this.log('removing tag from %d old relays', relayPeers.length)

        // remove old relay tag and redial
        await Promise.all(
          relayPeers.map(async peer => {
            await this.peerStore.merge(peer.id, {
              tags: {
                [RELAY_TAG]: undefined,
                [KEEP_ALIVE_TAG]: undefined
              }
            })
          })
        )

        if (this.reservations.size < this.maxDiscoveredRelays) {
          this.log('not enough relays %d/%d', this.reservations.size, this.maxDiscoveredRelays)
          this.safeDispatchEvent('relay:not-enough-relays', {})
        }
      })
      .catch(err => {
        this.log.error(err)
      })
  }

  stop (): void {
    this.reserveQueue.clear()
    this.reservations.forEach(({ timeout }) => {
      clearTimeout(timeout)
    })
    this.reservations.clear()
    this.started = false
  }

  /**
   * If the number of current relays is beneath the configured `maxReservations`
   * value, and the passed peer id is not our own, and we have a non-relayed
   * connection to the remote, and the remote peer speaks the hop protocol, try
   * to reserve a slot on the remote peer
   */
  async addRelay (peerId: PeerId, type: RelayType): Promise<void> {
    if (this.peerId.equals(peerId)) {
      this.log.trace('not trying to use self as relay')
      return
    }

    if (this.reserveQueue.size > this.maxReservationQueueLength) {
      this.log.trace('not adding potential relay peer %p as the queue is full', peerId)
      return
    }

    if (this.reserveQueue.has(peerId)) {
      this.log.trace('potential relay peer %p is already in the reservation queue', peerId)
      return
    }

    if (this.relayFilter.has(peerId.toMultihash().bytes)) {
      this.log.trace('potential relay peer %p has failed previously, not trying again', peerId)
      return
    }

    this.log.trace('try to reserve relay slot with %p', peerId)

    await this.reserveQueue.add(async () => {
      const start = Date.now()

      try {
        // allow refresh of an existing reservation if it is about to expire
        const existingReservation = this.reservations.get(peerId)

        if (existingReservation != null) {
          const connections = this.connectionManager.getConnections(peerId)
          let connected = false

          if (connections.length === 0) {
            this.log('already have relay reservation with %p but we are no longer connected', peerId)
          }

          if (connections.map(conn => conn.id).includes(existingReservation.connection)) {
            this.log('already have relay reservation with %p and the original connection is still open', peerId)
            connected = true
          }

          if (connected && getExpirationMilliseconds(existingReservation.reservation.expire) > REFRESH_WINDOW) {
            this.log('already have relay reservation with %p but we are still connected and it does not expire soon', peerId)
            return
          }

          await this.#removeReservation(peerId, existingReservation)
        }

        if (type === 'discovered' && [...this.reservations.values()].reduce((acc, curr) => {
          if (curr.type === 'discovered') {
            acc++
          }

          return acc
        }, 0) >= this.maxDiscoveredRelays) {
          this.log.trace('already have enough discovered relays')
          return
        }

        const signal = AbortSignal.timeout(this.reservationCompletionTimeout)
        setMaxListeners(Infinity, signal)

        const connection = await this.connectionManager.openConnection(peerId, {
          signal
        })

        if (connection.remoteAddr.protoNames().includes('p2p-circuit')) {
          this.log('not creating reservation over relayed connection')
          return
        }

        const reservation = await this.#createReservation(connection, {
          signal
        })

        const expiration = getExpirationMilliseconds(reservation.expire)

        this.log('created reservation on relay peer %p, expiry date is %s', peerId, new Date(Date.now() + expiration).toString())

        // sets a lower bound on the timeout, and also don't let it go over
        // 2^31 - 1 (setTimeout will only accept signed 32 bit integers)
        const timeoutDuration = Math.min(Math.max(expiration - REFRESH_TIMEOUT, REFRESH_TIMEOUT_MIN), Math.pow(2, 31) - 1)

        const timeout = setTimeout(() => {
          this.log('refresh reservation to relay %p', peerId)

          this.addRelay(peerId, type)
            .catch(async err => {
              this.log.error('could not refresh reservation to relay %p - %e', peerId, err)

              const reservation = this.reservations.get(peerId)

              if (reservation == null) {
                this.log.error('did not have reservation after refreshing reservation failed %p', peerId)
                return
              }

              await this.#removeReservation(peerId, reservation)
            })
            .catch(err => {
              this.log.error('could not remove expired reservation to relay %p - %e', peerId, err)
            })
        }, timeoutDuration)

        // we've managed to create a reservation successfully
        this.reservations.set(peerId, {
          timeout,
          reservation,
          type,
          connection: connection.id
        })

        // ensure we don't close the connection to the relay
        await this.peerStore.merge(peerId, {
          tags: {
            [RELAY_TAG]: {
              value: 1,
              ttl: expiration
            },
            [KEEP_ALIVE_TAG]: {
              value: 1,
              ttl: expiration
            }
          }
        })

        // listen on multiaddr that only the circuit transport is listening for
        await this.transportManager.listen([multiaddr(`/p2p/${peerId.toString()}/p2p-circuit/p2p/${this.peerId.toString()}`)])

        this.safeDispatchEvent('relay:created-reservation', {
          detail: peerId
        })
      } catch (err) {
        this.log.error('could not reserve slot on %p after %dms', peerId, Date.now() - start, err)

        // don't try this peer again
        this.relayFilter.add(peerId.toMultihash().bytes)

        // cancel the renewal timeout if it's been set
        const reservation = this.reservations.get(peerId)

        // if listening failed, remove the reservation
        if (reservation != null) {
          this.#removeReservation(peerId, reservation)
            .catch(err => {
              this.log.error('could not remove reservation on %p after reserving slot failed - %e', peerId, err)
            })
        }
      }
    }, {
      peerId
    })
  }

  hasReservation (peerId: PeerId): boolean {
    return this.reservations.has(peerId)
  }

  getReservation (peerId: PeerId): Reservation | undefined {
    return this.reservations.get(peerId)?.reservation
  }

  reservationCount (): number {
    return this.reservations.size
  }

  async cancelReservations (): Promise<void> {
    await Promise.all(
      [...this.reservations.entries()].map(async ([peerId, reservation]) => {
        await this.#removeReservation(peerId, reservation)
      })
    )
  }

  async #createReservation (connection: Connection, options: AbortOptions): Promise<Reservation> {
    options.signal?.throwIfAborted()

    this.log('requesting reservation from %p', connection.remotePeer)
    const stream = await connection.newStream(RELAY_V2_HOP_CODEC, options)
    const pbstr = pbStream(stream)
    const hopstr = pbstr.pb(HopMessage)
    await hopstr.write({ type: HopMessage.Type.RESERVE }, options)

    let response: HopMessage

    try {
      response = await hopstr.read(options)
    } catch (err: any) {
      stream.abort(err)
      throw err
    } finally {
      if (stream.status !== 'closed') {
        await stream.close(options)
      }
    }

    if (response.status === Status.OK && response.reservation != null) {
      // check that the returned relay has the relay address - this can be
      // omitted when requesting a reservation from a go-libp2p relay we
      // already have a reservation on
      const addresses = new Set<string>()
      addresses.add(connection.remoteAddr.toString())

      for (const buf of response.reservation.addrs) {
        let ma = multiaddr(buf)

        if (ma.getPeerId() == null) {
          ma = ma.encapsulate(`/p2p/${connection.remotePeer}`)
        }

        // TODO: workaround for https://github.com/libp2p/go-libp2p/issues/3003
        ma = multiaddr(ma.toString().replace(
          `/p2p/${connection.remotePeer}/p2p/${connection.remotePeer}`,
          `/p2p/${connection.remotePeer}`
        ))

        addresses.add(ma.toString())
      }

      response.reservation.addrs = [...addresses].map(str => multiaddr(str).bytes)

      return response.reservation
    }

    const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
    this.log.error(errMsg)

    throw new Error(errMsg)
  }

  /**
   * Remove listen relay
   */
  async #removeReservation (peerId: PeerId, reservation: RelayEntry): Promise<void> {
    if (!this.reservations.has(peerId)) {
      this.log('not removing relay reservation with %p from local store as we do not have a reservation with this peer', peerId)
      return
    }

    this.log('removing relay reservation with %p from local store', peerId)
    clearTimeout(reservation.timeout)
    this.reservations.delete(peerId)

    // untag the relay
    await this.peerStore.merge(peerId, {
      tags: {
        [RELAY_TAG]: undefined,
        [KEEP_ALIVE_TAG]: undefined
      }
    })

    this.safeDispatchEvent('relay:removed', { detail: peerId })

    if (this.reservations.size < this.maxDiscoveredRelays) {
      this.log('not enough relays %d/%d', this.reservations.size, this.maxDiscoveredRelays)
      this.safeDispatchEvent('relay:not-enough-relays', {})
    }
  }
}

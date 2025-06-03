import { ListenError } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { multiaddr } from '@multiformats/multiaddr'
import { Circuit } from '@multiformats/multiaddr-matcher'
import { pbStream } from 'it-protobuf-stream'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { nanoid } from 'nanoid'
import { DEFAULT_MAX_RESERVATION_QUEUE_LENGTH, DEFAULT_RESERVATION_COMPLETION_TIMEOUT, DEFAULT_RESERVATION_CONCURRENCY, KEEP_ALIVE_TAG, RELAY_V2_HOP_CODEC } from '../constants.js'
import { DoubleRelayError, HadEnoughRelaysError, RelayQueueFullError } from '../errors.js'
import { HopMessage, Status } from '../pb/index.js'
import { getExpirationMilliseconds } from '../utils.js'
import type { Reservation } from '../pb/index.js'
import type { AbortOptions, Libp2pEvents, ComponentLogger, Logger, PeerId, PeerStore, Startable, Metrics, Peer, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Filter } from '@libp2p/utils/filters'
import type { TypedEventTarget } from 'main-event'

// allow refreshing a relay reservation if it will expire in the next 10 minutes
const REFRESH_WINDOW = (60 * 1000) * 10

// try to refresh relay reservations 5 minutes before expiry
const REFRESH_TIMEOUT = (60 * 1000) * 5

// minimum duration before which a reservation must not be refreshed
const REFRESH_TIMEOUT_MIN = 30 * 1000

export interface ReservationStoreComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
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

export interface DiscoveredRelayEntry {
  timeout: ReturnType<typeof setTimeout>
  type: 'discovered'
  reservation: Reservation

  /**
   * Stores the id of the connection we have to the relay
   */
  connection: string

  /**
   * Stores the identifier returned when the reservation was requested
   */
  id: string
}

export interface ConfiguredRelayEntry {
  timeout: ReturnType<typeof setTimeout>
  type: 'configured'
  reservation: Reservation

  /**
   * Stores the id of the connection we have to the relay
   */
  connection: string
}

export type RelayEntry = DiscoveredRelayEntry | ConfiguredRelayEntry

export interface RelayReservation {
  relay: PeerId
  details: RelayEntry
}

export interface ReservationStoreEvents {
  'relay:not-enough-relays': CustomEvent
  'relay:found-enough-relays': CustomEvent
  'relay:removed': CustomEvent<RelayReservation>
  'relay:created-reservation': CustomEvent<RelayReservation>
}

export class ReservationStore extends TypedEventEmitter<ReservationStoreEvents> implements Startable {
  private readonly peerId: PeerId
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly reserveQueue: PeerQueue<RelayReservation>
  private readonly reservations: PeerMap<RelayEntry>
  private readonly pendingReservations: string[]
  private readonly maxReservationQueueLength: number
  private readonly reservationCompletionTimeout: number
  private started: boolean
  private readonly log: Logger
  private relayFilter: Filter

  constructor (components: ReservationStoreComponents, init?: ReservationStoreInit) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:transport:reservation-store')
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
    this.events = components.events
    this.reservations = new PeerMap()
    this.pendingReservations = []
    this.maxReservationQueueLength = init?.maxReservationQueueLength ?? DEFAULT_MAX_RESERVATION_QUEUE_LENGTH
    this.reservationCompletionTimeout = init?.reservationCompletionTimeout ?? DEFAULT_RESERVATION_COMPLETION_TIMEOUT
    this.started = false
    this.relayFilter = createScalableCuckooFilter(100)

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

      this.#removeReservation(evt.detail.remotePeer)
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
            return peer.tags.has(KEEP_ALIVE_TAG)
          }]
        })

        this.log('removing tag from %d old relays', relayPeers.length)

        // remove old relay tag and redial
        await Promise.all(
          relayPeers.map(async peer => {
            await this.peerStore.merge(peer.id, {
              tags: {
                [KEEP_ALIVE_TAG]: undefined
              }
            })
          })
        )

        this.log('redialing %d old relays', relayPeers.length)
        await Promise.all(
          relayPeers.map(async peer => this.addRelay(peer.id, 'discovered'))
        )

        this.#checkReservationCount()
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

  reserveRelay (): string {
    const id = nanoid()

    this.pendingReservations.push(id)

    this.#checkReservationCount()

    return id
  }

  /**
   * If the number of current relays is beneath the configured `maxReservations`
   * value, and the passed peer id is not our own, and we have a non-relayed
   * connection to the remote, and the remote peer speaks the hop protocol, try
   * to reserve a slot on the remote peer
   */
  async addRelay (peerId: PeerId, type: RelayType): Promise<RelayReservation> {
    if (this.peerId.equals(peerId)) {
      this.log.trace('not trying to use self as relay')
      throw new ListenError('Cannot use self as relay')
    }

    if (this.reserveQueue.size > this.maxReservationQueueLength) {
      throw new RelayQueueFullError('The reservation queue is full')
    }

    const existingJob = this.reserveQueue.find(peerId)

    if (existingJob != null) {
      this.log.trace('potential relay peer %p is already in the reservation queue', peerId)
      return existingJob.join()
    }

    if (this.relayFilter.has(peerId.toMultihash().bytes)) {
      throw new ListenError('The relay was previously invalid')
    }

    this.log.trace('try to reserve relay slot with %p', peerId)

    return this.reserveQueue.add(async () => {
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
            return {
              relay: peerId,
              details: existingReservation
            } satisfies RelayReservation
          }

          await this.#removeReservation(peerId)
        }

        if (type === 'discovered' && this.pendingReservations.length === 0) {
          throw new HadEnoughRelaysError('Not making reservation on discovered relay because we do not need any more relays')
        }

        const signal = AbortSignal.timeout(this.reservationCompletionTimeout)
        setMaxListeners(Infinity, signal)

        const connection = await this.connectionManager.openConnection(peerId, {
          signal
        })

        if (Circuit.matches(connection.remoteAddr)) {
          throw new DoubleRelayError('not creating reservation over relayed connection')
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
              await this.#removeReservation(peerId)
            })
            .catch(err => {
              this.log.error('could not remove expired reservation to relay %p - %e', peerId, err)
            })
        }, timeoutDuration)

        let res: RelayEntry

        // assign a reservation id if one was requested
        if (type === 'discovered') {
          const id = this.pendingReservations.pop()

          if (id == null) {
            throw new HadEnoughRelaysError('Made reservation on relay but did not need any more discovered relays')
          }

          res = {
            timeout,
            reservation,
            type,
            connection: connection.id,
            id
          }
        } else {
          res = {
            timeout,
            reservation,
            type,
            connection: connection.id
          }
        }

        // we've managed to create a reservation successfully
        this.reservations.set(peerId, res)

        // ensure we don't close the connection to the relay
        await this.peerStore.merge(peerId, {
          tags: {
            [KEEP_ALIVE_TAG]: {
              value: 1,
              ttl: expiration
            }
          }
        })

        // check to see if we have discovered enough relays
        this.#checkReservationCount()

        const result: RelayReservation = {
          relay: peerId,
          details: res
        }

        this.safeDispatchEvent('relay:created-reservation', {
          detail: result
        })

        return result
      } catch (err: any) {
        if (!(type === 'discovered' && err.name === 'HadEnoughRelaysError')) {
          this.log.error('could not reserve slot on %p after %dms - %e', peerId, Date.now() - start, err)
        }

        // don't try this peer again if dialing failed or they do not support
        // the hop protocol
        if (err.name === 'DialError' || err.name === 'UnsupportedProtocolError') {
          this.relayFilter.add(peerId.toMultihash().bytes)
        }

        // if listening failed, remove the reservation
        this.#removeReservation(peerId)
          .catch(err => {
            this.log.error('could not remove reservation on %p after reserving slot failed - %e', peerId, err)
          })

        throw err
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

  reservationCount (type?: RelayType): number {
    if (type == null) {
      return this.reservations.size
    }

    return [...this.reservations.values()].reduce((acc, curr) => {
      if (curr.type === type) {
        acc++
      }

      return acc
    }, 0)
  }

  cancelReservations (): void {
    [...this.reservations.values()].forEach(reservation => {
      clearTimeout(reservation.timeout)
    })

    this.reservations.clear()
  }

  async #createReservation (connection: Connection, options: AbortOptions): Promise<Reservation> {
    options.signal?.throwIfAborted()

    this.log('requesting reservation from %p', connection.remotePeer)
    const stream = await connection.newStream(RELAY_V2_HOP_CODEC, options)
    const pbstr = pbStream(stream)
    const hopstr = pbstr.pb(HopMessage)

    this.log.trace('send RESERVE to %p', connection.remotePeer)
    await hopstr.write({ type: HopMessage.Type.RESERVE }, options)

    let response: HopMessage

    try {
      this.log.trace('reading response from %p', connection.remotePeer)
      response = await hopstr.read(options)
    } catch (err: any) {
      stream.abort(err)
      throw err
    } finally {
      if (stream.status !== 'closed') {
        await stream.close(options)
      }
    }

    this.log.trace('read response %o', response)

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
  async #removeReservation (peerId: PeerId): Promise<void> {
    const reservation = this.reservations.get(peerId)

    if (reservation == null) {
      return
    }

    this.log('removing relay reservation with %p from local store', peerId)
    clearTimeout(reservation.timeout)
    this.reservations.delete(peerId)

    // discover a new relay for this discovery request
    if (reservation.type === 'discovered') {
      this.pendingReservations.push(
        reservation.id
      )
    }

    // untag the relay
    await this.peerStore.merge(peerId, {
      tags: {
        [KEEP_ALIVE_TAG]: undefined
      }
    })

    this.safeDispatchEvent('relay:removed', {
      detail: {
        relay: peerId,
        details: reservation
      }
    })

    // maybe trigger discovery of new relays
    this.#checkReservationCount()
  }

  #checkReservationCount (): void {
    if (this.pendingReservations.length === 0) {
      this.log.trace('have discovered enough relays')
      this.reserveQueue.clear()
      this.safeDispatchEvent('relay:found-enough-relays')

      return
    }

    this.relayFilter = createScalableCuckooFilter(100)
    this.log('not discovered enough relays %d/%d', this.reservations.size, this.pendingReservations.length)
    this.safeDispatchEvent('relay:not-enough-relays')
  }
}

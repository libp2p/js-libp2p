import { TypedEventEmitter } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { DEFAULT_RESERVATION_CONCURRENCY, RELAY_TAG, RELAY_V2_HOP_CODEC } from '../constants.js'
import { HopMessage, Status } from '../pb/index.js'
import { getExpirationMilliseconds } from '../utils.js'
import type { Reservation } from '../pb/index.js'
import type { TypedEventTarget, Libp2pEvents, AbortOptions, ComponentLogger, Logger, Connection, PeerId, PeerStore, Startable, Metrics } from '@libp2p/interface'
import type { ConnectionManager, TransportManager } from '@libp2p/interface-internal'

// allow refreshing a relay reservation if it will expire in the next 10 minutes
const REFRESH_WINDOW = (60 * 1000) * 10

// try to refresh relay reservations 5 minutes before expiry
const REFRESH_TIMEOUT = (60 * 1000) * 5

// minimum duration before which a reservation must not be refreshed
const REFRESH_TIMEOUT_MIN = 30 * 1000

export interface RelayStoreComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  transportManager: TransportManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  metrics?: Metrics
}

export interface RelayStoreInit {
  /**
   * Multiple relays may be discovered simultaneously - to prevent listening
   * on too many relays, this value controls how many to attempt to reserve a
   * slot on at once. If set to more than one, we may end up listening on
   * more relays than the `maxReservations` value, but on networks with poor
   * connectivity the user may wish to attempt to reserve on multiple relays
   * simultaneously. (default: 1)
   */
  reservationConcurrency?: number

  /**
   * How many discovered relays to allow in the reservation store
   */
  discoverRelays?: number

  /**
   * Limit the number of potential relays we will dial (default: 100)
   */
  maxReservationQueueLength?: number

  /**
   * When creating a reservation it must complete within this number of ms
   * (default: 5000)
   */
  reservationCompletionTimeout?: number
}

export type RelayType = 'discovered' | 'configured'

interface RelayEntry {
  timeout: ReturnType<typeof setTimeout>
  type: RelayType
  reservation: Reservation
}

export interface ReservationStoreEvents {
  'relay:not-enough-relays': CustomEvent
  'relay:removed': CustomEvent<PeerId>
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

  constructor (components: RelayStoreComponents, init?: RelayStoreInit) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:transport:reservation-store')
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.transportManager = components.transportManager
    this.peerStore = components.peerStore
    this.events = components.events
    this.reservations = new PeerMap()
    this.maxDiscoveredRelays = init?.discoverRelays ?? 0
    this.maxReservationQueueLength = init?.maxReservationQueueLength ?? 100
    this.reservationCompletionTimeout = init?.reservationCompletionTimeout ?? 10000
    this.started = false

    // ensure we don't listen on multiple relays simultaneously
    this.reserveQueue = new PeerQueue({
      concurrency: init?.reservationConcurrency ?? DEFAULT_RESERVATION_CONCURRENCY,
      metricName: 'libp2p_relay_reservation_queue',
      metrics: components.metrics
    })

    // When a peer disconnects, if we had a reservation on that peer
    // remove the reservation and multiaddr and maybe trigger search
    // for new relays
    this.events.addEventListener('peer:disconnect', (evt) => {
      this.#removeRelay(evt.detail)
    })
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.started = true
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
   * value, and the passed peer id is not our own, and we have a non-relayed connection
   * to the remote, and the remote peer speaks the hop protocol, try to reserve a slot
   * on the remote peer
   */
  async addRelay (peerId: PeerId, type: RelayType): Promise<void> {
    if (this.peerId.equals(peerId)) {
      this.log('not trying to use self as relay')
      return
    }

    if (this.reserveQueue.size > this.maxReservationQueueLength) {
      this.log('not adding relay as the queue is full')
      return
    }

    if (this.reserveQueue.has(peerId)) {
      this.log('relay peer is already in the reservation queue')
      return
    }

    this.log('add relay %p', peerId)

    await this.reserveQueue.add(async () => {
      try {
        // allow refresh of an existing reservation if it is about to expire
        const existingReservation = this.reservations.get(peerId)

        if (existingReservation != null) {
          if (getExpirationMilliseconds(existingReservation.reservation.expire) > REFRESH_WINDOW) {
            this.log('already have reservation on relay peer %p and it expires in more than 10 minutes', peerId)
            return
          }

          clearTimeout(existingReservation.timeout)
          this.reservations.delete(peerId)
        }

        if (type === 'discovered' && [...this.reservations.values()].reduce((acc, curr) => {
          if (curr.type === 'discovered') {
            acc++
          }

          return acc
        }, 0) >= this.maxDiscoveredRelays) {
          this.log('already have enough discovered relays')
          return
        }

        const signal = AbortSignal.timeout(this.reservationCompletionTimeout)

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

        this.log('created reservation on relay peer %p', peerId)

        const expiration = getExpirationMilliseconds(reservation.expire)

        // sets a lower bound on the timeout, and also don't let it go over
        // 2^31 - 1 (setTimeout will only accept signed 32 bit integers)
        const timeoutDuration = Math.min(Math.max(expiration - REFRESH_TIMEOUT, REFRESH_TIMEOUT_MIN), Math.pow(2, 31) - 1)

        const timeout = setTimeout(() => {
          this.addRelay(peerId, type).catch(err => {
            this.log.error('could not refresh reservation to relay %p', peerId, err)
          })
        }, timeoutDuration)

        // we've managed to create a reservation successfully
        this.reservations.set(peerId, {
          timeout,
          reservation,
          type
        })

        // ensure we don't close the connection to the relay
        await this.peerStore.merge(peerId, {
          tags: {
            [RELAY_TAG]: {
              value: 1,
              ttl: expiration
            }
          }
        })

        // listen on multiaddr that only the circuit transport is listening for
        await this.transportManager.listen([multiaddr(`/p2p/${peerId.toString()}/p2p-circuit`)])
      } catch (err) {
        this.log.error('could not reserve slot on %p', peerId, err)

        // cancel the renewal timeout if it's been set
        const reservation = this.reservations.get(peerId)

        if (reservation != null) {
          clearTimeout(reservation.timeout)
        }

        // if listening failed, remove the reservation
        this.reservations.delete(peerId)
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
      this.log.error('error parsing reserve message response from %p because', connection.remotePeer, err)
      stream.abort(err)
      throw err
    } finally {
      await stream.close()
    }

    if (response.status === Status.OK && (response.reservation != null)) {
      // check that the returned relay has the relay address - this can be
      // omitted when requesting a reservation from a go-libp2p relay we
      // already have a reservation on
      let hasRelayAddress = false
      const relayAddressBytes = connection.remoteAddr.bytes

      for (const buf of response.reservation.addrs) {
        if (uint8ArrayEquals(relayAddressBytes, buf)) {
          hasRelayAddress = true
          break
        }
      }

      if (!hasRelayAddress) {
        response.reservation.addrs.push(relayAddressBytes)
      }

      return response.reservation
    }

    const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
    this.log.error(errMsg)

    throw new Error(errMsg)
  }

  /**
   * Remove listen relay
   */
  #removeRelay (peerId: PeerId): void {
    const existingReservation = this.reservations.get(peerId)

    if (existingReservation == null) {
      return
    }

    this.log('connection to relay %p closed, removing reservation from local store', peerId)

    clearTimeout(existingReservation.timeout)
    this.reservations.delete(peerId)

    this.safeDispatchEvent('relay:removed', { detail: peerId })

    if (this.reservations.size < this.maxDiscoveredRelays) {
      this.log('not enough relays %d/%d', this.reservations.size, this.maxDiscoveredRelays)
      this.safeDispatchEvent('relay:not-enough-relays', {})
    }
  }
}

import type { PeerId } from '@libp2p/interface-peer-id'
import { PeerMap } from '@libp2p/peer-collections'
import PQueue from 'p-queue'
import { DEFAULT_RESERVATION_CONCURRENCY, RELAY_TAG, RELAY_V2_HOP_CODEC } from '../constants.js'
import { logger } from '@libp2p/logger'
import { pbStream } from 'it-pb-stream'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Connection } from '@libp2p/interface-connection'
import type { Reservation } from '../pb/index.js'
import { HopMessage, Status } from '../pb/index.js'
import { getExpirationMilliseconds } from '../utils.js'
import type { TransportManager } from '@libp2p/interface-transport'
import type { Startable } from '@libp2p/interfaces/dist/src/startable.js'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:circuit-relay:transport:reservation-store')

// allow refreshing a relay reservation if it will expire in the next 10 minutes
const REFRESH_WINDOW = (60 * 1000) * 10

// try to refresh relay reservations 5 minutes before expiry
const REFRESH_TIMEOUT = (60 * 1000) * 5

// maximum duration before which a reservation should be refereshed (2 hrs)
const REFRESH_TIMEOUT_MAX = (60 * 1000) * 15
// minimum duration before which a reservation must not be refreshed
const REFRESH_TIMEOUT_MIN = 30 * 1000

export interface RelayStoreComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  transportManager: TransportManager
  peerStore: PeerStore
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

export class ReservationStore extends EventEmitter<ReservationStoreEvents> implements Startable {
  private readonly peerId: PeerId
  private readonly connectionManager: ConnectionManager
  private readonly transportManager: TransportManager
  private readonly peerStore: PeerStore
  private readonly reserveQueue: PQueue
  private readonly reservations: PeerMap<RelayEntry>
  private readonly maxDiscoveredRelays: number
  private started: boolean

  constructor (components: RelayStoreComponents, init?: RelayStoreInit) {
    super()

    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.transportManager = components.transportManager
    this.peerStore = components.peerStore
    this.reservations = new PeerMap()
    this.maxDiscoveredRelays = init?.discoverRelays ?? 0
    this.started = false

    // ensure we don't listen on multiple relays simultaneously
    this.reserveQueue = new PQueue({
      concurrency: init?.reservationConcurrency ?? DEFAULT_RESERVATION_CONCURRENCY
    })

    // When a peer disconnects, if we had a reservation on that peer
    // remove the reservation and multiaddr and maybe trigger search
    // for new relays
    this.connectionManager.addEventListener('peer:disconnect', (evt) => {
      this.removeRelay(evt.detail.remotePeer)
    })
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    this.started = true
  }

  async stop (): Promise<void> {
    this.reservations.forEach(({ timeout }) => {
      clearTimeout(timeout)
    })
    this.reservations.clear()

    this.started = true
  }

  /**
   * If the number of current relays is beneath the configured `maxReservations`
   * value, and the passed peer id is not our own, and we have a non-relayed connection
   * to the remote, and the remote peer speaks the hop protocol, try to reserve a slot
   * on the remote peer
   */
  async addRelay (peerId: PeerId, type: RelayType): Promise<void> {
    log('add relay', this.reserveQueue.size)

    await this.reserveQueue.add(async () => {
      try {
        if (this.peerId.equals(peerId)) {
          log('not trying to use self as relay')
          return
        }

        // allow refresh of an existing reservation if it is about to expire
        const existingReservation = this.reservations.get(peerId)

        if (existingReservation != null) {
          if (getExpirationMilliseconds(existingReservation.reservation.expire) > REFRESH_WINDOW) {
            log('already have reservation on relay peer %p and it expires in more than 10 minutes', peerId)
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
          log('already have enough discovered relays')
          return
        }

        const connection = await this.connectionManager.openConnection(peerId)

        if (connection.remoteAddr.protoNames().includes('p2p-circuit')) {
          log('not creating reservation over relayed connection')
          return
        }

        const reservation = await this.#createReservation(connection)

        log('created reservation on relay peer %p', peerId)

        const expiration = getExpirationMilliseconds(reservation.expire)

        // sets a lower bound as 0 for the timeout
        const timeoutDuration = Math.max(expiration - REFRESH_TIMEOUT, REFRESH_TIMEOUT_MIN)
        // sets an upper bound on the timeout
        const boundedTimeoutDuration = Math.min(timeoutDuration, REFRESH_TIMEOUT_MAX)

        const timeout = setTimeout(() => {
          this.addRelay(peerId, type).catch(err => {
            log.error('could not refresh reservation to relay %p', peerId, err)
          })
        }, boundedTimeoutDuration)

        this.reservations.set(peerId, {
          timeout,
          reservation,
          type
        })

        // ensure we don't close the connection to the relay
        await this.peerStore.tagPeer(peerId, RELAY_TAG, {
          value: 1,
          ttl: expiration
        })

        await this.transportManager.listen(
          reservation.addrs.map(ma => {
            return multiaddr(ma).encapsulate('/p2p-circuit')
          })
        )
      } catch (err) {
        log.error('could not reserve slot on %p', peerId, err)
      }
    })
  }

  hasReservation (peerId: PeerId): boolean {
    return this.reservations.has(peerId)
  }

  async #createReservation (connection: Connection): Promise<Reservation> {
    log('requesting reservation from %s', connection.remotePeer)
    const stream = await connection.newStream(RELAY_V2_HOP_CODEC)
    const pbstr = pbStream(stream)
    const hopstr = pbstr.pb(HopMessage)
    hopstr.write({ type: HopMessage.Type.RESERVE })

    let response: HopMessage

    try {
      response = await hopstr.read()
    } catch (err: any) {
      log.error('error parsing reserve message response from %s because', connection.remotePeer, err.message)
      throw err
    } finally {
      stream.close()
    }

    if (response.status === Status.OK && (response.reservation != null)) {
      return response.reservation
    }

    const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
    log.error(errMsg)

    throw new Error(errMsg)
  }

  /**
   * Remove listen relay
   */
  removeRelay (peerId: PeerId): void {
    const existingReservation = this.reservations.get(peerId)

    if (existingReservation == null) {
      return
    }

    log('removing relay %p', peerId)

    clearTimeout(existingReservation.timeout)
    this.reservations.delete(peerId)

    this.safeDispatchEvent('relay:removed', { detail: peerId })

    if (this.reservations.size < this.maxDiscoveredRelays) {
      this.dispatchEvent(new CustomEvent('relay:not-enough-relays'))
    }
  }
}

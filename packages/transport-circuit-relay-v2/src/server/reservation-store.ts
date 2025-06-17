import { trackedPeerMap } from '@libp2p/peer-collections'
import { retimeableSignal } from 'retimeable-signal'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT, DEFAULT_MAX_RESERVATION_STORE_SIZE, DEFAULT_MAX_RESERVATION_TTL } from '../constants.js'
import { Status } from '../pb/index.js'
import type { RelayReservation } from '../index.js'
import type { Limit } from '../pb/index.js'
import type { ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Multiaddr } from '@multiformats/multiaddr'

export type ReservationStatus = Status.OK | Status.PERMISSION_DENIED | Status.RESERVATION_REFUSED

export interface ReservationStoreComponents {
  logger: ComponentLogger
  metrics?: Metrics
}

export interface ReservationStoreInit {
  /**
   * maximum number of reservations allowed
   *
   * @default 15
   */
  maxReservations?: number

  /**
   * interval after which stale reservations are cleared
   *
   * @default 300000
   */
  reservationClearInterval?: number

  /**
   * apply default relay limits to a new reservation
   *
   * @default true
   */
  applyDefaultLimit?: boolean

  /**
   * reservation ttl
   *
   * @default 7200000
   */
  reservationTtl?: number

  /**
   * The maximum time a relayed connection can be open for
   */
  defaultDurationLimit?: number

  /**
   * The maximum amount of data allowed to be transferred over a relayed connection
   */
  defaultDataLimit?: bigint
}

export class ReservationStore {
  public readonly reservations: PeerMap<RelayReservation>
  private readonly maxReservations: number
  private readonly applyDefaultLimit: boolean
  private readonly reservationTtl: number
  private readonly defaultDurationLimit: number
  private readonly defaultDataLimit: bigint
  private readonly log: Logger

  constructor (components: ReservationStoreComponents, init: ReservationStoreInit = {}) {
    this.log = components.logger.forComponent('libp2p:circuit-relay:server:reservation-store')
    this.maxReservations = init.maxReservations ?? DEFAULT_MAX_RESERVATION_STORE_SIZE
    this.applyDefaultLimit = init.applyDefaultLimit !== false
    this.reservationTtl = init.reservationTtl ?? DEFAULT_MAX_RESERVATION_TTL
    this.defaultDurationLimit = init.defaultDurationLimit ?? DEFAULT_DURATION_LIMIT
    this.defaultDataLimit = init.defaultDataLimit ?? DEFAULT_DATA_LIMIT

    this.reservations = trackedPeerMap<RelayReservation>({
      metrics: components.metrics,
      name: 'libp2p_circuit_relay_server_reservations_total'
    })
  }

  reserve (peer: PeerId, addr: Multiaddr, limit?: Limit): { status: ReservationStatus, expire?: number } {
    let reservation = this.reservations.get(peer)

    if (this.reservations.size >= this.maxReservations && reservation == null) {
      return { status: Status.RESERVATION_REFUSED }
    }

    const expiry = new Date(Date.now() + this.reservationTtl)
    let checkedLimit: Limit | undefined

    if (this.applyDefaultLimit) {
      checkedLimit = limit ?? {
        data: this.defaultDataLimit,
        duration: this.defaultDurationLimit
      }
    }

    if (reservation != null) {
      this.log('refreshing reservation for client %p', peer)
      reservation.signal.reset(this.reservationTtl)
    } else {
      this.log('creating new reservation for client %p', peer)
      reservation = {
        addr,
        expiry,
        limit: checkedLimit,
        signal: retimeableSignal(this.reservationTtl)
      }
    }

    this.reservations.set(peer, reservation)

    reservation.signal.addEventListener('abort', () => {
      this.reservations.delete(peer)
    })

    // return expiry time in seconds
    return { status: Status.OK, expire: Math.round(expiry.getTime() / 1000) }
  }

  removeReservation (peer: PeerId): void {
    this.reservations.delete(peer)
  }

  get (peer: PeerId): RelayReservation | undefined {
    return this.reservations.get(peer)
  }

  clear (): void {
    this.reservations.clear()
  }
}

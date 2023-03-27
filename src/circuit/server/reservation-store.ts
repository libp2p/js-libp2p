import { Limit, Status } from '../pb/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import { PeerMap } from '@libp2p/peer-collections'
import type { RecursivePartial } from '@libp2p/interfaces'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT, DEFAULT_MAX_RESERVATION_CLEAR_INTERVAL, DEFAULT_MAX_RESERVATION_STORE_SIZE, DEFAULT_MAX_RESERVATION_TTL } from '../constants.js'
import type { RelayReservation } from '../index.js'

export type ReservationStatus = Status.OK | Status.PERMISSION_DENIED | Status.RESERVATION_REFUSED

export interface ReservationStoreInit {
  /*
   * maximum number of reservations allowed, default: 15
   */
  maxReservations?: number
  /*
   * interval after which stale reservations are cleared, default: 300s
   */
  reservationClearInterval?: number
  /*
   * apply default relay limits to a new reservation, default: true
   */
  applyDefaultLimit?: boolean
  /**
   * reservation ttl, default: 2 hours
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

export type ReservationStoreOptions = RecursivePartial<ReservationStoreInit>

export class ReservationStore implements Startable {
  public readonly reservations = new PeerMap<RelayReservation>()
  private _started = false
  private interval: any
  private readonly maxReservations: number
  private readonly reservationClearInterval: number
  private readonly applyDefaultLimit: boolean
  private readonly reservationTtl: number
  private readonly defaultDurationLimit: number
  private readonly defaultDataLimit: bigint

  constructor (options: ReservationStoreOptions = {}) {
    this.maxReservations = options.maxReservations ?? DEFAULT_MAX_RESERVATION_STORE_SIZE
    this.reservationClearInterval = options.reservationClearInterval ?? DEFAULT_MAX_RESERVATION_CLEAR_INTERVAL
    this.applyDefaultLimit = options.applyDefaultLimit !== false
    this.reservationTtl = options.reservationTtl ?? DEFAULT_MAX_RESERVATION_TTL
    this.defaultDurationLimit = options.defaultDurationLimit ?? DEFAULT_DURATION_LIMIT
    this.defaultDataLimit = options.defaultDataLimit ?? DEFAULT_DATA_LIMIT
  }

  isStarted (): boolean {
    return this._started
  }

  start (): void {
    if (this._started) {
      return
    }
    this._started = true
    this.interval = setInterval(
      () => {
        const now = (new Date()).getTime()
        this.reservations.forEach((r, k) => {
          if (r.expire.getTime() < now) {
            this.reservations.delete(k)
          }
        })
      },
      this.reservationClearInterval
    )
  }

  stop (): void {
    clearInterval(this.interval)
  }

  reserve (peer: PeerId, addr: Multiaddr, limit?: Limit): { status: ReservationStatus, expire?: number } {
    if (this.reservations.size >= this.maxReservations && !this.reservations.has(peer)) {
      return { status: Status.RESERVATION_REFUSED }
    }

    const expire = new Date(Date.now() + this.reservationTtl)
    let checkedLimit: Limit | undefined

    if (this.applyDefaultLimit) {
      checkedLimit = limit ?? { data: this.defaultDataLimit, duration: this.defaultDurationLimit }
    }

    this.reservations.set(peer, { addr, expire, limit: checkedLimit })

    // return expiry time in seconds
    return { status: Status.OK, expire: Math.round(expire.getTime() / 1000) }
  }

  removeReservation (peer: PeerId): void {
    this.reservations.delete(peer)
  }

  hasReservation (dst: PeerId): boolean {
    return this.reservations.has(dst)
  }

  get (peer: PeerId): RelayReservation | undefined {
    return this.reservations.get(peer)
  }
}

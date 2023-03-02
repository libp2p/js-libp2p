import { Limit, Status } from './pb/index.js'
import type { ReservationStore as IReservationStore, ReservationStatus, Reservation } from './interfaces.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import { PeerMap } from '@libp2p/peer-collections'
import type { RecursivePartial } from '@libp2p/interfaces'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT } from './constants.js'

export interface ReservationStoreInit {
  /*
   * maximum number of reservations allowed, default: 15
   */
  maxReservations: number
  /*
   * interval after which stale reservations are cleared, default: 300s
   */
  reservationClearInterval: number
  /*
   * apply default relay limits to a new reservation, default: true
   */
  applyDefaultLimit: boolean
  /**
   * reservation ttl, default: 2 hours
   */
  reservationTtl: number
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

export class ReservationStore implements IReservationStore, Startable {
  private readonly reservations = new PeerMap<Reservation>()
  private _started = false;
  private interval: any
  private readonly init: ReservationStoreInit

  constructor (options?: ReservationStoreOptions) {
    this.init = {
      maxReservations: options?.maxReservations ?? 15,
      reservationClearInterval: options?.reservationClearInterval ?? 300 * 1000,
      applyDefaultLimit: options?.applyDefaultLimit !== false,
      reservationTtl: options?.reservationTtl ?? 2 * 60 * 60 * 1000,
      defaultDurationLimit: options?.defaultDurationLimit ?? DEFAULT_DURATION_LIMIT,
      defaultDataLimit: options?.defaultDataLimit ?? DEFAULT_DATA_LIMIT
    }
  }

  isStarted () {
    return this._started
  }

  start () {
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
      this.init.reservationClearInterval
    )
  }

  stop () {
    clearInterval(this.interval)
  }

  reserve (peer: PeerId, addr: Multiaddr, limit?: Limit): { status: ReservationStatus, expire?: number } {
    if (this.reservations.size >= this.init.maxReservations && !this.reservations.has(peer)) {
      return { status: Status.RESERVATION_REFUSED }
    }
    const expire = new Date(Date.now() + this.init.reservationTtl)
    let checkedLimit: Limit | undefined
    if (this.init.applyDefaultLimit) {
      checkedLimit = limit ?? { data: this.init.defaultDataLimit, duration: this.init.defaultDurationLimit }
    }
    this.reservations.set(peer, { addr, expire, limit: checkedLimit })
    return { status: Status.OK, expire: expire.getTime() }
  }

  removeReservation (peer: PeerId): void {
    this.reservations.delete(peer)
  }

  hasReservation (dst: PeerId): boolean {
    return this.reservations.has(dst)
  }

  get (peer: PeerId): Reservation | undefined {
    return this.reservations.get(peer)
  }
}

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
      applyDefaultLimit: options?.applyDefaultLimit === false,
      reservationTtl: options?.reservationTtl ?? 2 * 60 * 60 * 1000
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

  async reserve (peer: PeerId, addr: Multiaddr, limit?: Limit): Promise<{ status: ReservationStatus, expire?: number }> {
    if (this.reservations.size >= this.init.maxReservations && !this.reservations.has(peer)) {
      return { status: Status.RESERVATION_REFUSED }
    }
    const expire = new Date(Date.now() + this.init.reservationTtl)
    let checkedLimit: Limit | undefined
    if (this.init.applyDefaultLimit) {
      checkedLimit = limit ?? { data: BigInt(DEFAULT_DATA_LIMIT), duration: DEFAULT_DURATION_LIMIT }
    }
    this.reservations.set(peer, { addr, expire, limit: checkedLimit })
    return { status: Status.OK, expire: expire.getTime() }
  }

  async removeReservation (peer: PeerId) {
    this.reservations.delete(peer)
  }

  async hasReservation (dst: PeerId) {
    return this.reservations.has(dst)
  }

  async get (peer: PeerId): Promise<Reservation | undefined> {
    return this.reservations.get(peer)
  }
}

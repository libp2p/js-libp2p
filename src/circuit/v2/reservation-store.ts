import { Status } from './pb/index.js'
import type { ReservationStore as IReservationStore, ReservationStatus } from './interfaces.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'

interface Reservation {
  addr: Multiaddr
  expire: Date
}

export class ReservationStore implements IReservationStore, Startable {
  private readonly reservations = new Map<string, Reservation>()
  private _started = false;
  private interval: any

  /**
   * @param limit - maximum number of reservations to store
   * @param reservationClearInterval - interval to check for expired reservations in millisecons
   */
  constructor (private readonly limit = 15, private readonly reservationClearInterval = 300 * 1000) {
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
      this.reservationClearInterval
    )
  }

  stop () {
    clearInterval(this.interval)
  }

  async reserve (peer: PeerId, addr: Multiaddr): Promise<{ status: ReservationStatus, expire?: number }> {
    if (this.reservations.size >= this.limit && !this.reservations.has(peer.toString())) {
      return { status: Status.RESERVATION_REFUSED, expire: undefined }
    }
    const expire = new Date()
    expire.setHours(expire.getHours() + 12)
    this.reservations.set(peer.toString(), { addr, expire })
    return { status: Status.OK, expire: expire.getTime() }
  }

  async removeReservation (peer: PeerId) {
    this.reservations.delete(peer.toString())
  }

  async hasReservation (dst: PeerId) {
    return this.reservations.has(dst.toString())
  }
}

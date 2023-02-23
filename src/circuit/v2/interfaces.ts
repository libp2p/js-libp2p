import type { PeerId } from '@libp2p/interface-peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Limit, Status } from './pb/index.js'

export type ReservationStatus = Status.OK | Status.PERMISSION_DENIED | Status.RESERVATION_REFUSED

export interface Reservation {
  addr: Multiaddr
  expire: Date
  limit?: Limit
}

export interface ReservationStore {
  reserve: (peer: PeerId, addr: Multiaddr, limit?: Limit) => Promise<{status: ReservationStatus, expire?: number}>
  removeReservation: (peer: PeerId) => Promise<void>
  hasReservation: (dst: PeerId) => Promise<boolean>
  get: (peer: PeerId) => Promise<Reservation | undefined>
}

export type AclStatus = Status.OK | Status.RESOURCE_LIMIT_EXCEEDED | Status.PERMISSION_DENIED

export interface Acl {
  allowReserve: (peer: PeerId, addr: Multiaddr) => Promise<boolean>
  /**
   * Checks if connection should be allowed
   */
  allowConnect: (src: PeerId, addr: Multiaddr, dst: PeerId) => Promise<AclStatus>
}

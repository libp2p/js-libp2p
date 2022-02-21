import { PeerId } from 'peer-id'
import { Multiaddr } from 'multiaddr'
import { HopMessage, Status } from './protocol'

type ReservationStatus = Status.OK | Status.PERMISSION_DENIED | Status.RESERVATION_REFUSED

export interface ReservationStore {
  reserve: (peer: PeerId, addr: Multiaddr) => Promise<{status: ReservationStatus, expire?: number}>
  removeReservation: (peer: PeerId) => Promise<void>
  hasReservation: (dst: PeerId) => Promise<boolean>
}

type AclStatus = Status.OK | Status.RESOURCE_LIMIT_EXCEEDED | Status.PERMISSION_DENIED

export interface Acl {
  allowReserve: (peer: PeerId, addr: Multiaddr) => Promise<boolean>
  /**
   * Checks if connection should be allowed
   */
  allowConnect: (src: PeerId, addr: Multiaddr, dst: PeerId) => Promise<AclStatus>
}

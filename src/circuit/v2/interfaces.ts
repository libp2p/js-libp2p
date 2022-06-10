import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Status } from './pb/index.js'

export type ReservationStatus = Status.OK | Status.PERMISSION_DENIED | Status.RESERVATION_REFUSED

export interface ReservationStore {
  reserve: (peer: PeerId, addr: Multiaddr) => Promise<{status: ReservationStatus, expire?: bigint}>
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

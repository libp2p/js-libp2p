import type { PeerId } from '@libp2p/interface-peer-id'
import type { Record } from '@libp2p/interface-record'
import { ReservationVoucher } from './pb/index.js'

export interface ReservationVoucherOptions {
  relay: PeerId
  peer: PeerId
  expiration: number
}

export class ReservationVoucherRecord implements Record {
  public readonly domain = 'libp2p-relay-rsvp'
  public readonly codec = new Uint8Array([0x03, 0x02])

  private readonly relay: PeerId
  private readonly peer: PeerId
  private readonly expiration: number

  constructor ({ relay, peer, expiration }: ReservationVoucherOptions) {
    this.relay = relay
    this.peer = peer
    this.expiration = expiration
  }

  marshal (): Uint8Array {
    return ReservationVoucher.encode({
      relay: this.relay.toBytes(),
      peer: this.peer.toBytes(),
      expiration: BigInt(this.expiration)
    })
  }

  equals (other: Record): boolean {
    if (!(other instanceof ReservationVoucherRecord)) {
      return false
    }
    if (!this.peer.equals(other.peer)) {
      return false
    }

    if (!this.relay.equals(other.relay)) {
      return false
    }

    if (this.expiration !== other.expiration) {
      return false
    }

    return true
  }
}

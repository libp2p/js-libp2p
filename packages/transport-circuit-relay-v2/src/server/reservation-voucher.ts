import { ReservationVoucher } from '../pb/index.js'
import type { PeerId, Record } from '@libp2p/interface'

export interface ReservationVoucherOptions {
  relay: PeerId
  peer: PeerId
  expiration: bigint
}

export class ReservationVoucherRecord implements Record {
  public readonly domain = 'libp2p-relay-rsvp'
  public readonly codec = new Uint8Array([0x03, 0x02])

  private readonly relay: PeerId
  private readonly peer: PeerId
  private readonly expiration: bigint

  constructor ({ relay, peer, expiration }: ReservationVoucherOptions) {
    this.relay = relay
    this.peer = peer
    this.expiration = expiration
  }

  marshal (): Uint8Array {
    return ReservationVoucher.encode({
      relay: this.relay.toMultihash().bytes,
      peer: this.peer.toMultihash().bytes,
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

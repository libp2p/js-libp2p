import { peerIdFromMultihash } from '@libp2p/peer-id'
import { arrayEquals } from '@libp2p/utils/array-equals'
import { multiaddr } from '@multiformats/multiaddr'
import * as Digest from 'multiformats/hashes/digest'
import {
  ENVELOPE_DOMAIN_PEER_RECORD,
  ENVELOPE_PAYLOAD_TYPE_PEER_RECORD
} from './consts.js'
import { PeerRecord as Protobuf } from './peer-record.js'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PeerRecordInit {
  peerId: PeerId

  /**
   * Addresses of the associated peer.
   */
  multiaddrs?: Multiaddr[]

  /**
   * Monotonically-increasing sequence counter that's used to order PeerRecords in time.
   */
  seqNumber?: bigint
}

/**
 * The PeerRecord is used for distributing peer routing records across the network.
 * It contains the peer's reachable listen addresses.
 */
export class PeerRecord {
  /**
   * Unmarshal Peer Record Protobuf
   */
  static createFromProtobuf = (buf: Uint8Array | Uint8ArrayList): PeerRecord => {
    const peerRecord = Protobuf.decode(buf)
    const peerId = peerIdFromMultihash(Digest.decode(peerRecord.peerId))
    const multiaddrs = (peerRecord.addresses ?? []).map((a) => multiaddr(a.multiaddr))
    const seqNumber = peerRecord.seq

    return new PeerRecord({ peerId, multiaddrs, seqNumber })
  }

  static DOMAIN = ENVELOPE_DOMAIN_PEER_RECORD
  static CODEC = ENVELOPE_PAYLOAD_TYPE_PEER_RECORD

  public peerId: PeerId
  public multiaddrs: Multiaddr[]
  public seqNumber: bigint
  public domain = PeerRecord.DOMAIN
  public codec = PeerRecord.CODEC
  private marshaled?: Uint8Array

  constructor (init: PeerRecordInit) {
    const { peerId, multiaddrs, seqNumber } = init

    this.peerId = peerId
    this.multiaddrs = multiaddrs ?? []
    this.seqNumber = seqNumber ?? BigInt(Date.now())
  }

  /**
   * Marshal a record to be used in an envelope
   */
  marshal (): Uint8Array {
    if (this.marshaled == null) {
      this.marshaled = Protobuf.encode({
        peerId: this.peerId.toMultihash().bytes,
        seq: BigInt(this.seqNumber),
        addresses: this.multiaddrs.map((m) => ({
          multiaddr: m.bytes
        }))
      })
    }

    return this.marshaled
  }

  /**
   * Returns true if `this` record equals the `other`
   */
  equals (other: unknown): boolean {
    if (!(other instanceof PeerRecord)) {
      return false
    }

    // Validate PeerId
    if (!this.peerId.equals(other.peerId)) {
      return false
    }

    // Validate seqNumber
    if (this.seqNumber !== other.seqNumber) {
      return false
    }

    // Validate multiaddrs
    if (!arrayEquals(this.multiaddrs, other.multiaddrs)) {
      return false
    }

    return true
  }
}

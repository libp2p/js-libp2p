import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { convertPeerId } from './utils.js'
import type { PeerId, PeerInfo } from '@libp2p/interface'

interface PeerDistance {
  peer: PeerInfo
  distance: Uint8Array
}

/**
 * Maintains a list of peerIds sorted by distance from a DHT key.
 */
export class PeerDistanceList {
  /**
   * The DHT key from which distance is calculated
   */
  private readonly originDhtKey: Uint8Array

  /**
   * The maximum size of the list
   */
  private readonly capacity: number

  private peerDistances: PeerDistance[]

  constructor (originDhtKey: Uint8Array, capacity: number) {
    this.originDhtKey = originDhtKey
    this.capacity = capacity
    this.peerDistances = []
  }

  /**
   * The length of the list
   */
  get length (): number {
    return this.peerDistances.length
  }

  /**
   * The peers in the list, in order of distance from the origin key
   */
  get peers (): PeerInfo[] {
    return this.peerDistances.map(pd => pd.peer)
  }

  /**
   * Add a peerId to the list.
   */
  async add (peer: PeerInfo): Promise<void> {
    const dhtKey = await convertPeerId(peer.id)

    this.addWithKadId(peer, dhtKey)
  }

  /**
   * Add a peerId to the list.
   */
  addWithKadId (peer: PeerInfo, kadId: Uint8Array): void {
    if (this.peerDistances.find(pd => pd.peer.id.equals(peer.id)) != null) {
      return
    }

    const el = {
      peer,
      distance: uint8ArrayXor(this.originDhtKey, kadId)
    }

    let added = false

    for (let j = 0; j < this.peerDistances.length; j++) {
      const distance = uint8ArrayXorCompare(this.peerDistances[j].distance, el.distance)
      if (distance === 0 || distance === 1) {
        added = true
        this.peerDistances.splice(j, 0, el)
        break
      }
    }

    if (!added) {
      this.peerDistances.push(el)
    }

    this.peerDistances = this.peerDistances.slice(0, this.capacity)
  }

  /**
   * Indicates whether any of the peerIds passed as a parameter are closer
   * to the origin key than the furthest peerId in the PeerDistanceList.
   */
  async isCloser (peerId: PeerId): Promise<boolean> {
    if (this.length === 0) {
      return true
    }

    const dhtKey = await convertPeerId(peerId)
    const dhtKeyXor = uint8ArrayXor(dhtKey, this.originDhtKey)
    const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance

    return uint8ArrayXorCompare(dhtKeyXor, furthestDistance) === -1
  }

  /**
   * Indicates whether any of the peerIds passed as a parameter are closer
   * to the origin key than the furthest peerId in the PeerDistanceList.
   */
  async anyCloser (peerIds: PeerId[]): Promise<boolean> {
    if (peerIds.length === 0) {
      return false
    }

    return Promise.any(
      peerIds.map(async peerId => this.isCloser(peerId))
    )
  }
}

import { convertPeerId, getDistance } from '../utils.js'
import type { PeerId } from '@libp2p/interface'

interface PeerDistance {
  peerId: PeerId
  distance: bigint
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
   * The peerIds in the list, in order of distance from the origin key
   */
  get peers (): PeerId[] {
    return this.peerDistances.map(pd => pd.peerId)
  }

  /**
   * Add a peerId to the list.
   */
  async add (peerId: PeerId): Promise<void> {
    const dhtKey = await convertPeerId(peerId)

    this.addWitKadId(peerId, dhtKey)
  }

  /**
   * Add a peerId to the list.
   */
  addWitKadId (peerId: PeerId, kadId: Uint8Array): void {
    if (this.peerDistances.find(pd => pd.peerId.equals(peerId)) != null) {
      return
    }

    const el = {
      peerId,
      distance: getDistance(this.originDhtKey, kadId)
    }

    this.peerDistances.push(el)
    this.peerDistances.sort((a, b) => {
      if (a.distance < b.distance) {
        return -1
      }

      if (a.distance > b.distance) {
        return 1
      }

      return 0
    })
    this.peerDistances = this.peerDistances.slice(0, this.capacity)
  }

  /**
   * Indicates whether any of the peerIds passed as a parameter are closer
   * to the origin key than the furthest peerId in the PeerDistanceList.
   */
  async anyCloser (peerIds: PeerId[]): Promise<boolean> {
    if (peerIds.length === 0) {
      return false
    }

    if (this.length === 0) {
      return true
    }

    const dhtKeys = await Promise.all(peerIds.map(convertPeerId))
    const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance

    for (const dhtKey of dhtKeys) {
      const keyDistance = getDistance(this.originDhtKey, dhtKey)

      if (keyDistance < furthestDistance) {
        return true
      }
    }

    return false
  }
}

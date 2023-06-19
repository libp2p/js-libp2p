import type { PeerId } from '@libp2p/interface-peer-id'

/**
 * A list of unique peers.
 */
export class PeerList {
  private readonly list: PeerId[]

  constructor () {
    this.list = []
  }

  /**
   * Add a new peer. Returns `true` if it was a new one
   */
  push (peerId: PeerId): boolean {
    if (!this.has(peerId)) {
      this.list.push(peerId)

      return true
    }

    return false
  }

  /**
   * Check if this PeerInfo is already in here
   */
  has (peerId: PeerId): boolean {
    const match = this.list.find((i) => i.equals(peerId))
    return Boolean(match)
  }

  /**
   * Get the list as an array
   */
  toArray (): PeerId[] {
    return this.list.slice()
  }

  /**
   * Remove the last element
   */
  pop (): PeerId | undefined {
    return this.list.pop()
  }

  /**
   * The length of the list
   */
  get length (): number {
    return this.list.length
  }
}

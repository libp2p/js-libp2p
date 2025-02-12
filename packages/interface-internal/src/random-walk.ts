import type { AbortOptions, PeerInfo } from '@libp2p/interface'

/**
 * The `RandomWalk` module facilitates peer discovery by randomly finding and dialing peers 
 * on the libp2p network. It is useful in conjunction with a registered `Topology` to 
 * discover common network services.
 */

/**
 * The `RandomWalk` interface provides a mechanism for discovering and connecting to
 * random peers on the libp2p network.
 */
export interface RandomWalk {
  /**
   * Initiates a random walk for peer discovery.
   *
   * This method either begins a new random walk or joins an existing one. The process 
   * continues to find and return random peers until it is aborted.
   *
   * @param options - Optional `AbortOptions` to allow early termination of the walk.
   * @returns An `AsyncGenerator` that yields discovered `PeerInfo` objects.
   *
   */
  walk(options?: AbortOptions): AsyncGenerator<PeerInfo>
}

import type { AbortOptions, PeerInfo } from '@libp2p/interface'

/**
 * The `RandomWalk` component uses the libp2p peer routing to find arbitrary
 * network peers. Consumers may then dial these peers, causing the Identify
 * protocol to run and any registered topologies to be notified of their
 * supported protocols.
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
   */
  walk(options?: AbortOptions): AsyncGenerator<PeerInfo>
}

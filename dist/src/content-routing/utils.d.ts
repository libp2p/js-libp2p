export type PeerId = import('peer-id');
export type Multiaddr = import('multiaddr').Multiaddr;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */
/**
 * Store the multiaddrs from every peer in the passed peer store
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {import('../peer-store')} peerStore
 */
export function storeAddresses(source: AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>, peerStore: import('../peer-store')): AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>;
/**
 * Filter peers by unique peer id
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 */
export function uniquePeers(source: AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>): AsyncGenerator<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}, void, unknown>;
/**
 * Require at least `min` peers to be yielded from `source`
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {number} min
 */
export function requirePeers(source: AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>, min?: number): AsyncGenerator<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}, void, unknown>;
/**
 * If `max` is passed, only take that number of peers from the source
 * otherwise take all the peers
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {number} [max]
 */
export function maybeLimitSource(source: AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>, max?: number | undefined): AsyncIterable<{
    id: PeerId;
    multiaddrs: Multiaddr[];
}>;
//# sourceMappingURL=utils.d.ts.map
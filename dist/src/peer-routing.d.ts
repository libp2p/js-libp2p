export = PeerRouting;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr')} Multiaddr
 */
declare class PeerRouting {
    /**
     * @class
     * @param {import('./')} libp2p
     */
    constructor(libp2p: import('./'));
    _peerId: import("peer-id");
    _peerStore: import("./peer-store");
    _routers: any;
    _refreshManagerOptions: any;
    /**
     * Recurrent task to find closest peers and add their addresses to the Address Book.
     */
    _findClosestPeersTask(): Promise<void>;
    /**
     * Start peer routing service.
     */
    start(): void;
    _timeoutId: any;
    /**
     * Stop peer routing service.
     */
    stop(): void;
    /**
     * Iterates over all peer routers in series to find the given peer.
     *
     * @param {PeerId} id - The id of the peer to find
     * @param {object} [options]
     * @param {number} [options.timeout] - How long the query should run
     * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    findPeer(id: PeerId, options?: {
        timeout?: number | undefined;
    } | undefined): Promise<{
        id: PeerId;
        multiaddrs: Multiaddr[];
    }>;
    /**
     * Attempt to find the closest peers on the network to the given key.
     *
     * @param {Uint8Array} key - A CID like key
     * @param {Object} [options]
     * @param {number} [options.timeout=30e3] - How long the query can take.
     * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    getClosestPeers(key: Uint8Array, options?: {
        timeout?: number | undefined;
    } | undefined): AsyncIterable<{
        id: PeerId;
        multiaddrs: Multiaddr[];
    }>;
}
declare namespace PeerRouting {
    export { PeerId, Multiaddr };
}
type PeerId = import("peer-id");
type Multiaddr = import("multiaddr");
//# sourceMappingURL=peer-routing.d.ts.map
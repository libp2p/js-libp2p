export = PeerRouting;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 */
/**
 * @typedef {Object} RefreshManagerOptions
 * @property {boolean} [enabled = true] - Whether to enable the Refresh manager
 * @property {number} [bootDelay = 6e5] - Boot delay to start the Refresh Manager (in ms)
 * @property {number} [interval = 10e3] - Interval between each Refresh Manager run (in ms)
 * @property {number} [timeout = 10e3] - How long to let each refresh run (in ms)
 *
 * @typedef {Object} PeerRoutingOptions
 * @property {RefreshManagerOptions} [refreshManager]
 */
declare class PeerRouting {
    /**
     * @class
     * @param {import('./')} libp2p
     */
    constructor(libp2p: import('./'));
    _peerId: import("peer-id");
    _peerStore: import("./peer-store/types").PeerStore;
    /** @type {PeerRoutingModule[]} */
    _routers: PeerRoutingModule[];
    _refreshManagerOptions: {
        enabled: boolean;
        interval: number;
        bootDelay: number;
    } & RefreshManagerOptions;
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
     * Iterates over all peer routers in parallel to find the given peer.
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
     * @param {number} [options.timeout=30e3] - How long the query can take
     * @param {AbortSignal} [options.signal] - An AbortSignal to abort the request
     * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    getClosestPeers(key: Uint8Array, options?: {
        timeout?: number | undefined;
        signal?: AbortSignal | undefined;
    } | undefined): AsyncIterable<{
        id: PeerId;
        multiaddrs: Multiaddr[];
    }>;
}
declare namespace PeerRouting {
    export { PeerId, Multiaddr, PeerRoutingModule, RefreshManagerOptions, PeerRoutingOptions };
}
type PeerRoutingModule = import('libp2p-interfaces/src/peer-routing/types').PeerRouting;
type RefreshManagerOptions = {
    /**
     * - Whether to enable the Refresh manager
     */
    enabled?: boolean | undefined;
    /**
     * - Boot delay to start the Refresh Manager (in ms)
     */
    bootDelay?: number | undefined;
    /**
     * - Interval between each Refresh Manager run (in ms)
     */
    interval?: number | undefined;
    /**
     * - How long to let each refresh run (in ms)
     */
    timeout?: number | undefined;
};
type PeerId = import('peer-id');
type Multiaddr = import('multiaddr').Multiaddr;
type PeerRoutingOptions = {
    refreshManager?: RefreshManagerOptions | undefined;
};
//# sourceMappingURL=peer-routing.d.ts.map
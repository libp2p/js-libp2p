export = ContentRouting;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 */
/**
 * @typedef {Object} GetData
 * @property {PeerId} from
 * @property {Uint8Array} val
 */
declare class ContentRouting {
    /**
     * @class
     * @param {import('..')} libp2p
     */
    constructor(libp2p: import('..'));
    libp2p: import("..");
    /** @type {ContentRoutingModule[]} */
    routers: ContentRoutingModule[];
    dht: any;
    /**
     * Iterates over all content routers in parallel to find providers of the given key.
     *
     * @param {CID} key - The CID key of the content to find
     * @param {object} [options]
     * @param {number} [options.timeout] - How long the query should run
     * @param {number} [options.maxNumProviders] - maximum number of providers to find
     * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    findProviders(key: CID, options?: {
        timeout?: number | undefined;
        maxNumProviders?: number | undefined;
    } | undefined): AsyncIterable<{
        id: PeerId;
        multiaddrs: Multiaddr[];
    }>;
    /**
     * Iterates over all content routers in parallel to notify it is
     * a provider of the given key.
     *
     * @param {CID} key - The CID key of the content to find
     * @returns {Promise<void>}
     */
    provide(key: CID): Promise<void>;
    /**
     * Store the given key/value pair in the DHT.
     *
     * @param {Uint8Array} key
     * @param {Uint8Array} value
     * @param {Object} [options] - put options
     * @param {number} [options.minPeers] - minimum number of peers required to successfully put
     * @returns {Promise<void>}
     */
    put(key: Uint8Array, value: Uint8Array, options?: {
        minPeers?: number | undefined;
    } | undefined): Promise<void>;
    /**
     * Get the value to the given key.
     * Times out after 1 minute by default.
     *
     * @param {Uint8Array} key
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     * @returns {Promise<GetData>}
     */
    get(key: Uint8Array, options?: {
        timeout?: number | undefined;
    } | undefined): Promise<GetData>;
    /**
     * Get the `n` values to the given key without sorting.
     *
     * @param {Uint8Array} key
     * @param {number} nVals
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     */
    getMany(key: Uint8Array, nVals: number, options?: {
        timeout?: number | undefined;
    } | undefined): AsyncGenerator<{
        from: any;
        val: any;
    }, void, unknown>;
}
declare namespace ContentRouting {
    export { PeerId, Multiaddr, CID, ContentRoutingModule, GetData };
}
type ContentRoutingModule = import('libp2p-interfaces/src/content-routing/types').ContentRouting;
type CID = import('multiformats/cid').CID;
type PeerId = import('peer-id');
type Multiaddr = import('multiaddr').Multiaddr;
type GetData = {
    from: PeerId;
    val: Uint8Array;
};
//# sourceMappingURL=index.d.ts.map
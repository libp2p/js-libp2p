export type PeerId = import('peer-id');
export type ContentRoutingModule = import('libp2p-interfaces/src/content-routing/types').ContentRouting;
export type CID = import('multiformats/cid').CID;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 * @typedef {import('multiformats/cid').CID} CID
 */
/**
 * Wrapper class to convert events into returned values
 *
 * @implements {ContentRoutingModule}
 */
export class DHTContentRouting implements ContentRoutingModule {
    /**
     * @param {import('libp2p-kad-dht').DHT} dht
     */
    constructor(dht: import('libp2p-kad-dht').DHT);
    _dht: import("libp2p-kad-dht/dist/src/types").DHT;
    /**
     * @param {CID} cid
     */
    provide(cid: CID): Promise<void>;
    /**
     * @param {CID} cid
     * @param {*} options
     */
    findProviders(cid: CID, options: any): AsyncGenerator<import("libp2p-kad-dht/dist/src/types").PeerData, void, undefined>;
}
//# sourceMappingURL=dht-content-routing.d.ts.map
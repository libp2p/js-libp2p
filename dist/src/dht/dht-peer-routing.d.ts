export type PeerId = import('peer-id');
export type PeerRoutingModule = import('libp2p-interfaces/src/peer-routing/types').PeerRouting;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 */
/**
 * Wrapper class to convert events into returned values
 *
 * @implements {PeerRoutingModule}
 */
export class DHTPeerRouting implements PeerRoutingModule {
    /**
     * @param {import('libp2p-kad-dht').DHT} dht
     */
    constructor(dht: import('libp2p-kad-dht').DHT);
    _dht: import("libp2p-kad-dht/dist/src/types").DHT;
    /**
     * @param {PeerId} peerId
     * @param {any} options
     */
    findPeer(peerId: PeerId, options?: any): Promise<import("libp2p-kad-dht/dist/src/types").PeerData>;
    /**
     * @param {Uint8Array} key
     * @param {any} options
     */
    getClosestPeers(key: Uint8Array, options?: any): AsyncGenerator<import("libp2p-kad-dht/dist/src/types").PeerData, void, undefined>;
}
//# sourceMappingURL=dht-peer-routing.d.ts.map
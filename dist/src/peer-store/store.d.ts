export = PersistentStore;
declare class PersistentStore {
    /**
     * @param {import('interface-datastore').Datastore} datastore
     */
    constructor(datastore: import('interface-datastore').Datastore);
    _datastore: import("interface-datastore").Datastore;
    lock: any;
    /**
     * @param {PeerId} peerId
     * @returns {Key}
     */
    _peerIdToDatastoreKey(peerId: PeerId): Key;
    /**
     * @param {PeerId} peerId
     */
    has(peerId: PeerId): Promise<boolean>;
    /**
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @returns {Promise<import('./types').Peer>} peer
     */
    load(peerId: PeerId): Promise<import('./types').Peer>;
    /**
     * @param {Peer} peer
     */
    save(peer: Peer): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     */
    patch(peerId: PeerId, data: Partial<Peer>): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     */
    patchOrCreate(peerId: PeerId, data: Partial<Peer>): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     * @param {Peer} peer
     */
    _patch(peerId: PeerId, data: Partial<Peer>, peer: Peer): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     */
    merge(peerId: PeerId, data: Partial<Peer>): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     */
    mergeOrCreate(peerId: PeerId, data: Partial<Peer>): Promise<import("./types").Peer>;
    /**
     * @param {PeerId} peerId
     * @param {Partial<Peer>} data
     * @param {Peer} peer
     */
    _merge(peerId: PeerId, data: Partial<Peer>, peer: Peer): Promise<import("./types").Peer>;
    all(): AsyncGenerator<import("./types").Peer, void, unknown>;
}
declare namespace PersistentStore {
    export { PeerStore, EventName, Peer };
}
import PeerId = require("peer-id");
import { Key } from "interface-datastore/key";
type Peer = import('./types').Peer;
type PeerStore = import('./types').PeerStore;
type EventName = import('./types').EventName;
//# sourceMappingURL=store.d.ts.map
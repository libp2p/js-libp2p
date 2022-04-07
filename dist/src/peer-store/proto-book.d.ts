export = PersistentProtoBook;
/**
 * @implements {ProtoBook}
 */
declare class PersistentProtoBook implements ProtoBook {
    /**
     * @param {PeerStore["emit"]} emit
     * @param {import('./types').Store} store
     */
    constructor(emit: PeerStore["emit"], store: import('./types').Store);
    _emit: <U extends keyof import("./types").PeerStoreEvents>(event: U, ...args: Parameters<import("./types").PeerStoreEvents[U]>) => boolean;
    _store: import("./types").Store;
    /**
     * @param {PeerId} peerId
     */
    get(peerId: PeerId): Promise<string[]>;
    /**
     * @param {PeerId} peerId
     * @param {string[]} protocols
     */
    set(peerId: PeerId, protocols: string[]): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @param {string[]} protocols
     */
    add(peerId: PeerId, protocols: string[]): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @param {string[]} protocols
     */
    remove(peerId: PeerId, protocols: string[]): Promise<void>;
    /**
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
}
declare namespace PersistentProtoBook {
    export { PeerStore, ProtoBook };
}
type ProtoBook = import('./types').ProtoBook;
import PeerId = require("peer-id");
type PeerStore = import('./types').PeerStore;
//# sourceMappingURL=proto-book.d.ts.map
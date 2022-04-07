export = PeerStoreMetadataBook;
/**
 * @implements {MetadataBook}
 */
declare class PeerStoreMetadataBook implements MetadataBook {
    /**
     * The MetadataBook is responsible for keeping the known supported
     * protocols of a peer
     *
     * @param {PeerStore["emit"]} emit
     * @param {import('./types').Store} store
     */
    constructor(emit: PeerStore["emit"], store: import('./types').Store);
    _emit: <U extends keyof import("./types").PeerStoreEvents>(event: U, ...args: Parameters<import("./types").PeerStoreEvents[U]>) => boolean;
    _store: import("./types").Store;
    /**
     * Get the known data of a provided peer
     *
     * @param {PeerId} peerId
     */
    get(peerId: PeerId): Promise<Map<any, any>>;
    /**
     * Get specific metadata value, if it exists
     *
     * @param {PeerId} peerId
     * @param {string} key
     */
    getValue(peerId: PeerId, key: string): Promise<Uint8Array | undefined>;
    /**
     * @param {PeerId} peerId
     * @param {Map<string, Uint8Array>} metadata
     */
    set(peerId: PeerId, metadata: Map<string, Uint8Array>): Promise<void>;
    /**
     * Set metadata key and value of a provided peer
     *
     * @param {PeerId} peerId
     * @param {string} key - metadata key
     * @param {Uint8Array} value - metadata value
     */
    setValue(peerId: PeerId, key: string, value: Uint8Array): Promise<void>;
    /**
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @param {string} key
     */
    deleteValue(peerId: PeerId, key: string): Promise<void>;
}
declare namespace PeerStoreMetadataBook {
    export { PeerStore, MetadataBook };
}
type MetadataBook = import('./types').MetadataBook;
import PeerId = require("peer-id");
type PeerStore = import('./types').PeerStore;
//# sourceMappingURL=metadata-book.d.ts.map
export = MetadataBook;
declare const MetadataBook_base: typeof import("./book");
/**
 * @typedef {import('./')} PeerStore
 */
/**
 * @extends {Book}
 *
 * @fires MetadataBook#change:metadata
 */
declare class MetadataBook extends MetadataBook_base {
    /**
     * The MetadataBook is responsible for keeping the known supported
     * protocols of a peer.
     *
     * @class
     * @param {PeerStore} peerStore
     */
    constructor(peerStore: PeerStore);
    /**
     * Set data into the datastructure
     *
     * @override
     */
    _setValue(peerId: any, key: any, value: any, { emit }?: {
        emit?: boolean | undefined;
    }): void;
    /**
     * Get specific metadata value, if it exists
     *
     * @param {PeerId} peerId
     * @param {string} key
     * @returns {Uint8Array | undefined}
     */
    getValue(peerId: import("peer-id"), key: string): Uint8Array | undefined;
    /**
     * Deletes the provided peer metadata key from the book.
     *
     * @param {PeerId} peerId
     * @param {string} key
     * @returns {boolean}
     */
    deleteValue(peerId: import("peer-id"), key: string): boolean;
}
declare namespace MetadataBook {
    export { PeerStore };
}
type PeerStore = import(".");
//# sourceMappingURL=metadata-book.d.ts.map
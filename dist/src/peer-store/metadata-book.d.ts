export = MetadataBook;
/**
 * @typedef {import('./')} PeerStore
 */
/**
 * @typedef {Map<string, Uint8Array>} Metadata
 */
/**
 * @extends {Book<Metadata, Metadata, string>}
 *
 * @fires MetadataBook#change:metadata
 */
declare class MetadataBook extends Book<Metadata, Metadata, string> {
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
    getValue(peerId: PeerId, key: string): Uint8Array | undefined;
    /**
     * Deletes the provided peer metadata key from the book.
     *
     * @param {PeerId} peerId
     * @param {string} key
     * @returns {boolean}
     */
    deleteValue(peerId: PeerId, key: string): boolean;
}
declare namespace MetadataBook {
    export { PeerStore, Metadata };
}
type Metadata = Map<string, Uint8Array>;
import Book = require("./book");
import PeerId = require("peer-id");
type PeerStore = import(".");
//# sourceMappingURL=metadata-book.d.ts.map
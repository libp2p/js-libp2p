export = ProtoBook;
/**
 * @extends {Book<Set<string>, string[], string[]>}
 *
 * @fires ProtoBook#change:protocols
 */
declare class ProtoBook extends Book<Set<string>, string[], string[]> {
    /**
     * The ProtoBook is responsible for keeping the known supported
     * protocols of a peer.
     *
     * @class
     * @param {PeerStore} peerStore
     */
    constructor(peerStore: PeerStore);
    /**
     * Adds known protocols of a provided peer.
     * If the peer was not known before, it will be added.
     *
     * @param {PeerId} peerId
     * @param {string[]} protocols
     * @returns {ProtoBook}
     */
    add(peerId: PeerId, protocols: string[]): ProtoBook;
    /**
     * Removes known protocols of a provided peer.
     * If the protocols did not exist before, nothing will be done.
     *
     * @param {PeerId} peerId
     * @param {string[]} protocols
     * @returns {ProtoBook}
     */
    remove(peerId: PeerId, protocols: string[]): ProtoBook;
}
declare namespace ProtoBook {
    export { PeerStore };
}
import Book = require("./book");
import PeerId = require("peer-id");
type PeerStore = import(".");
//# sourceMappingURL=proto-book.d.ts.map
export = ProtoBook;
declare const ProtoBook_base: typeof import("./book");
/**
 * @typedef {import('./')} PeerStore
 */
/**
 * @extends {Book}
 *
 * @fires ProtoBook#change:protocols
 */
declare class ProtoBook extends ProtoBook_base {
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
    add(peerId: import("peer-id"), protocols: string[]): ProtoBook;
    /**
     * Removes known protocols of a provided peer.
     * If the protocols did not exist before, nothing will be done.
     *
     * @param {PeerId} peerId
     * @param {string[]} protocols
     * @returns {ProtoBook}
     */
    remove(peerId: import("peer-id"), protocols: string[]): ProtoBook;
}
declare namespace ProtoBook {
    export { PeerStore };
}
type PeerStore = import(".");
//# sourceMappingURL=proto-book.d.ts.map
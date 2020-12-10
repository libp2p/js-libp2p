export = KeyBook;
declare const KeyBook_base: typeof import("./book");
/**
 * @typedef {import('./')} PeerStore
 * @typedef {import('libp2p-crypto').PublicKey} PublicKey
 */
/**
 * @extends {Book}
 */
declare class KeyBook extends KeyBook_base {
    /**
     * The KeyBook is responsible for keeping the known public keys of a peer.
     *
     * @class
     * @param {PeerStore} peerStore
     */
    constructor(peerStore: PeerStore);
}
declare namespace KeyBook {
    export { PeerStore, PublicKey };
}
type PeerStore = import(".");
type PublicKey = import("libp2p-crypto").PublicKey;
//# sourceMappingURL=key-book.d.ts.map
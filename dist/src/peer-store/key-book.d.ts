export = KeyBook;
/**
 * @typedef {import('./')} PeerStore
 * @typedef {import('libp2p-crypto').PublicKey} PublicKey
 */
/**
 * @extends {Book}
 */
declare class KeyBook extends Book {
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
import Book = require("./book");
type PeerStore = import('./');
type PublicKey = import('libp2p-crypto').PublicKey;
//# sourceMappingURL=key-book.d.ts.map
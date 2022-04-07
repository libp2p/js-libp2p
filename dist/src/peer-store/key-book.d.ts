export = PeerStoreKeyBook;
/**
 * @implements {KeyBook}
 */
declare class PeerStoreKeyBook implements KeyBook {
    /**
     * The KeyBook is responsible for keeping the known public keys of a peer.
     *
     * @param {PeerStore["emit"]} emit
     * @param {import('./types').Store} store
     */
    constructor(emit: PeerStore["emit"], store: import('./types').Store);
    _emit: <U extends keyof import("./types").PeerStoreEvents>(event: U, ...args: Parameters<import("./types").PeerStoreEvents[U]>) => boolean;
    _store: import("./types").Store;
    /**
     * Set the Peer public key
     *
     * @param {PeerId} peerId
     * @param {PublicKey} publicKey
     */
    set(peerId: PeerId, publicKey: PublicKey): Promise<void>;
    /**
     * Get Public key of the given PeerId, if stored
     *
     * @param {PeerId} peerId
     */
    get(peerId: PeerId): Promise<import("libp2p-interfaces/src/keys/types").PublicKey | undefined>;
    /**
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
}
declare namespace PeerStoreKeyBook {
    export { PeerStore, KeyBook, PublicKey };
}
type KeyBook = import('./types').KeyBook;
import PeerId = require("peer-id");
type PublicKey = import('libp2p-interfaces/src/keys/types').PublicKey;
type PeerStore = import('./types').PeerStore;
//# sourceMappingURL=key-book.d.ts.map
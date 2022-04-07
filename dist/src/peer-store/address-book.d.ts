export = PeerStoreAddressBook;
/**
 * @implements {AddressBook}
 */
declare class PeerStoreAddressBook implements AddressBook {
    /**
     * @param {PeerStore["emit"]} emit
     * @param {import('./types').Store} store
     * @param {(peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>} addressFilter
     */
    constructor(emit: PeerStore["emit"], store: import('./types').Store, addressFilter: (peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>);
    _emit: <U extends keyof import("./types").PeerStoreEvents>(event: U, ...args: Parameters<import("./types").PeerStoreEvents[U]>) => boolean;
    _store: import("./types").Store;
    _addressFilter: (peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>;
    /**
     * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
     * This will return a boolean that indicates if the record was successfully processed and added
     * into the AddressBook.
     *
     * @param {Envelope} envelope
     */
    consumePeerRecord(envelope: Envelope): Promise<boolean>;
    /**
     * @param {PeerId} peerId
     */
    getRawEnvelope(peerId: PeerId): Promise<Uint8Array | undefined>;
    /**
     * Get an Envelope containing a PeerRecord for the given peer.
     * Returns undefined if no record exists.
     *
     * @param {PeerId} peerId
     */
    getPeerRecord(peerId: PeerId): Promise<Envelope | undefined>;
    /**
     * @param {PeerId} peerId
     */
    get(peerId: PeerId): Promise<import("./types").Address[]>;
    /**
     * @param {PeerId} peerId
     * @param {Multiaddr[]} multiaddrs
     */
    set(peerId: PeerId, multiaddrs: Multiaddr[]): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @param {Multiaddr[]} multiaddrs
     */
    add(peerId: PeerId, multiaddrs: Multiaddr[]): Promise<void>;
    /**
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
    /**
     * @param {PeerId} peerId
     * @param {(addresses: Address[]) => Address[]} [addressSorter]
     */
    getMultiaddrsForPeer(peerId: PeerId, addressSorter?: ((addresses: Address[]) => Address[]) | undefined): Promise<Multiaddr[]>;
}
declare namespace PeerStoreAddressBook {
    export { PeerStore, Address, AddressBook };
}
type AddressBook = import('./types').AddressBook;
import Envelope = require("../record/envelope");
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
type PeerStore = import('./types').PeerStore;
type Address = import('./types').Address;
//# sourceMappingURL=address-book.d.ts.map
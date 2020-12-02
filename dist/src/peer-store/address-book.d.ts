export = AddressBook;
declare const AddressBook_base: typeof import("./book");
/**
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('./')} PeerStore
 */
/**
 * @typedef {Object} Address
 * @property {Multiaddr} multiaddr peer multiaddr.
 * @property {boolean} isCertified obtained from a signed peer record.
 *
 * @typedef {Object} CertifiedRecord
 * @property {Uint8Array} raw raw envelope.
 * @property {number} seqNumber seq counter.
 *
 * @typedef {Object} Entry
 * @property {Address[]} addresses peer Addresses.
 * @property {CertifiedRecord} record certified peer record.
 */
/**
 * @extends {Book}
 */
declare class AddressBook extends AddressBook_base {
    /**
     * The AddressBook is responsible for keeping the known multiaddrs of a peer.
     *
     * @class
     * @param {PeerStore} peerStore
     */
    constructor(peerStore: PeerStore);
    /**
     * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
     * This will return a boolean that indicates if the record was successfully processed and added
     * into the AddressBook.
     *
     * @param {Envelope} envelope
     * @returns {boolean}
     */
    consumePeerRecord(envelope: import("../record/envelope")): boolean;
    /**
     * Get the raw Envelope for a peer. Returns
     * undefined if no Envelope is found.
     *
     * @param {PeerId} peerId
     * @returns {Uint8Array|undefined}
     */
    getRawEnvelope(peerId: import("peer-id")): Uint8Array | undefined;
    /**
     * Get an Envelope containing a PeerRecord for the given peer.
     * Returns undefined if no record exists.
     *
     * @param {PeerId} peerId
     * @returns {Promise<Envelope|void>|undefined}
     */
    getPeerRecord(peerId: import("peer-id")): Promise<import("../record/envelope") | void> | undefined;
    /**
     * Add known addresses of a provided peer.
     * If the peer is not known, it is set with the given addresses.
     *
     * @param {PeerId} peerId
     * @param {Multiaddr[]} multiaddrs
     * @returns {AddressBook}
     */
    add(peerId: import("peer-id"), multiaddrs: Multiaddr[]): AddressBook;
    /**
     * Transforms received multiaddrs into Address.
     *
     * @private
     * @param {Multiaddr[]} multiaddrs
     * @param {boolean} [isCertified]
     * @returns {Address[]}
     */
    private _toAddresses;
    /**
     * Get the known multiaddrs for a given peer. All returned multiaddrs
     * will include the encapsulated `PeerId` of the peer.
     * Returns `undefined` if there are no known multiaddrs for the given peer.
     *
     * @param {PeerId} peerId
     * @param {(addresses: Address[]) => Address[]} [addressSorter]
     * @returns {Multiaddr[]|undefined}
     */
    getMultiaddrsForPeer(peerId: import("peer-id"), addressSorter?: ((addresses: Address[]) => Address[]) | undefined): Multiaddr[] | undefined;
}
declare namespace AddressBook {
    export { Multiaddr, PeerStore, Address, CertifiedRecord, Entry };
}
type Multiaddr = import("multiaddr");
type Address = {
    /**
     * peer multiaddr.
     */
    multiaddr: Multiaddr;
    /**
     * obtained from a signed peer record.
     */
    isCertified: boolean;
};
type PeerStore = import(".");
type CertifiedRecord = {
    /**
     * raw envelope.
     */
    raw: Uint8Array;
    /**
     * seq counter.
     */
    seqNumber: number;
};
type Entry = {
    /**
     * peer Addresses.
     */
    addresses: Address[];
    /**
     * certified peer record.
     */
    record: CertifiedRecord;
};
//# sourceMappingURL=address-book.d.ts.map
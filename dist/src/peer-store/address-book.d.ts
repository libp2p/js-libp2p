export = AddressBook;
/**
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
declare class AddressBook extends Book {
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
    consumePeerRecord(envelope: Envelope): boolean;
    /**
     * Get the raw Envelope for a peer. Returns
     * undefined if no Envelope is found.
     *
     * @param {PeerId} peerId
     * @returns {Uint8Array|undefined}
     */
    getRawEnvelope(peerId: PeerId): Uint8Array | undefined;
    /**
     * Get an Envelope containing a PeerRecord for the given peer.
     * Returns undefined if no record exists.
     *
     * @param {PeerId} peerId
     * @returns {Promise<Envelope|void>|undefined}
     */
    getPeerRecord(peerId: PeerId): Promise<Envelope | void> | undefined;
    /**
     * Add known addresses of a provided peer.
     * If the peer is not known, it is set with the given addresses.
     *
     * @param {PeerId} peerId
     * @param {Multiaddr[]} multiaddrs
     * @returns {AddressBook}
     */
    add(peerId: PeerId, multiaddrs: Multiaddr[]): AddressBook;
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
    getMultiaddrsForPeer(peerId: PeerId, addressSorter?: ((addresses: Address[]) => Address[]) | undefined): Multiaddr[] | undefined;
}
declare namespace AddressBook {
    export { PeerStore, Address, CertifiedRecord, Entry };
}
import Book = require("./book");
import Envelope = require("../record/envelope");
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
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
type PeerStore = import('./');
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
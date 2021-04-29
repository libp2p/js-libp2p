export = PeerStore;
/**
 * @typedef {import('./address-book').Address} Address
 */
/**
 * @extends {EventEmitter}
 *
 * @fires PeerStore#peer Emitted when a new peer is added.
 * @fires PeerStore#change:protocols Emitted when a known peer supports a different set of protocols.
 * @fires PeerStore#change:multiaddrs Emitted when a known peer has a different set of multiaddrs.
 * @fires PeerStore#change:pubkey Emitted emitted when a peer's public key is known.
 * @fires PeerStore#change:metadata Emitted when the known metadata of a peer change.
 */
declare class PeerStore extends EventEmitter {
    /**
     * Peer object
     *
     * @typedef {Object} Peer
     * @property {PeerId} id peer's peer-id instance.
     * @property {Address[]} addresses peer's addresses containing its multiaddrs and metadata.
     * @property {string[]} protocols peer's supported protocols.
     * @property {Map<string, Uint8Array>|undefined} metadata peer's metadata map.
     */
    /**
     * Responsible for managing known peers, as well as their addresses, protocols and metadata.
     *
     * @param {object} options
     * @param {PeerId} options.peerId
     * @class
     */
    constructor({ peerId }: {
        peerId: PeerId;
    });
    _peerId: PeerId;
    /**
     * AddressBook containing a map of peerIdStr to Address.
     */
    addressBook: AddressBook;
    /**
     * KeyBook containing a map of peerIdStr to their PeerId with public keys.
     */
    keyBook: KeyBook;
    /**
     * MetadataBook containing a map of peerIdStr to their metadata Map.
     */
    metadataBook: MetadataBook;
    /**
     * ProtoBook containing a map of peerIdStr to supported protocols.
     */
    protoBook: ProtoBook;
    /**
     * Start the PeerStore.
     */
    start(): void;
    /**
     * Stop the PeerStore.
     */
    stop(): void;
    /**
     * Get all the stored information of every peer known.
     *
     * @returns {Map<string, Peer>}
     */
    get peers(): Map<string, Peer>;
    /**
     * Delete the information of the given peer in every book.
     *
     * @param {PeerId} peerId
     * @returns {boolean} true if found and removed
     */
    delete(peerId: PeerId): boolean;
    /**
     * Get the stored information of a given peer.
     *
     * @param {PeerId} peerId
     * @returns {Peer|undefined}
     */
    get(peerId: PeerId): Peer | undefined;
}
declare namespace PeerStore {
    export { Peer, Address };
}
import { EventEmitter } from "events";
import PeerId = require("peer-id");
import AddressBook = require("./address-book");
import KeyBook = require("./key-book");
import MetadataBook = require("./metadata-book");
import ProtoBook = require("./proto-book");
/**
 * Peer object
 */
type Peer = {
    /**
     * peer's peer-id instance.
     */
    id: PeerId;
    /**
     * peer's addresses containing its multiaddrs and metadata.
     */
    addresses: Address[];
    /**
     * peer's supported protocols.
     */
    protocols: string[];
    /**
     * peer's metadata map.
     */
    metadata: Map<string, Uint8Array> | undefined;
};
type Address = import('./address-book').Address;
//# sourceMappingURL=index.d.ts.map
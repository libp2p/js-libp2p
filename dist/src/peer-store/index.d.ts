export = DefaultPeerStore;
/**
 * An implementation of PeerStore that stores data in a Datastore
 *
 * @implements {PeerStore}
 */
declare class DefaultPeerStore extends EventEmitter implements PeerStore {
    /**
     * @param {object} properties
     * @param {PeerId} properties.peerId
     * @param {import('interface-datastore').Datastore} properties.datastore
     * @param {(peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>} properties.addressFilter
     */
    constructor({ peerId, datastore, addressFilter }: {
        peerId: PeerId;
        datastore: import('interface-datastore').Datastore;
        addressFilter: (peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>;
    });
    _peerId: import("peer-id");
    _store: Store;
    addressBook: AddressBook;
    keyBook: KeyBook;
    metadataBook: MetadataBook;
    protoBook: ProtoBook;
    getPeers(): AsyncGenerator<import("./types").Peer, void, unknown>;
    /**
     * Delete the information of the given peer in every book
     *
     * @param {PeerId} peerId
     */
    delete(peerId: PeerId): Promise<void>;
    /**
     * Get the stored information of a given peer
     *
     * @param {PeerId} peerId
     */
    get(peerId: PeerId): Promise<import("./types").Peer>;
    /**
     * Returns true if we have a record of the peer
     *
     * @param {PeerId} peerId
     */
    has(peerId: PeerId): Promise<boolean>;
}
declare namespace DefaultPeerStore {
    export { PeerStore, Peer, PeerId, Multiaddr };
}
type PeerStore = import('./types').PeerStore;
import { EventEmitter } from "events";
import Store = require("./store");
import AddressBook = require("./address-book");
import KeyBook = require("./key-book");
import MetadataBook = require("./metadata-book");
import ProtoBook = require("./proto-book");
type PeerId = import('peer-id');
type Multiaddr = import('multiaddr').Multiaddr;
type Peer = import('./types').Peer;
//# sourceMappingURL=index.d.ts.map
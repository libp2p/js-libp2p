export = PersistentPeerStore;
/**
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('../address-book.js').Address} Address
 */
/**
 * @typedef {Object} PersistentPeerStoreProperties
 * @property {PeerId} peerId
 * @property {import('interface-datastore').Datastore} datastore
 *
 * @typedef {Object} PersistentPeerStoreOptions
 * @property {number} [threshold = 5] - Number of dirty peers allowed before commit data.
 */
/**
 * Responsible for managing the persistence of data in the PeerStore.
 */
declare class PersistentPeerStore extends PeerStore {
    /**
     * @class
     * @param {PersistentPeerStoreProperties & PersistentPeerStoreOptions} properties
     */
    constructor({ peerId, datastore, threshold }: PersistentPeerStoreProperties & PersistentPeerStoreOptions);
    /**
     * Backend datastore used to persist data.
     */
    _datastore: import("interface-datastore").Datastore;
    /**
     * Peers modified after the latest data persisted.
     */
    _dirtyPeers: Set<any>;
    /**
     * Peers metadata changed mapping peer identifers to metadata changed.
     *
     * @type {Map<string, Set<string>>}
     */
    _dirtyMetadata: Map<string, Set<string>>;
    threshold: number;
    /**
     * Add modified peer to the dirty set
     *
     * @private
     * @param {Object} params
     * @param {PeerId} params.peerId
     */
    private _addDirtyPeer;
    /**
     * Add modified peer key to the dirty set
     *
     * @private
     * @param {Object} params
     * @param {PeerId} params.peerId
     */
    private _addDirtyPeerKey;
    /**
     * Add modified metadata peer to the set.
     *
     * @private
     * @param {Object} params
     * @param {PeerId} params.peerId
     * @param {string} params.metadata
     */
    private _addDirtyPeerMetadata;
    /**
     * Add all the peers current data to a datastore batch and commit it.
     *
     * @private
     * @returns {Promise<void>}
     */
    private _commitData;
    /**
     * Add address book data of the peer to the batch.
     *
     * @private
     * @param {PeerId} peerId
     * @param {Batch} batch
     */
    private _batchAddressBook;
    /**
     * Add Key book data of the peer to the batch.
     *
     * @private
     * @param {PeerId} peerId
     * @param {Batch} batch
     */
    private _batchKeyBook;
    /**
     * Add metadata book data of the peer to the batch.
     *
     * @private
     * @param {PeerId} peerId
     * @param {Batch} batch
     */
    private _batchMetadataBook;
    /**
     * Add proto book data of the peer to the batch.
     *
     * @private
     * @param {PeerId} peerId
     * @param {Batch} batch
     */
    private _batchProtoBook;
    /**
     * Process datastore entry and add its data to the correct book.
     *
     * @private
     * @param {Object} params
     * @param {Key} params.key - datastore key
     * @param {Uint8Array} params.value - datastore value stored
     * @returns {Promise<void>}
     */
    private _processDatastoreEntry;
}
declare namespace PersistentPeerStore {
    export { Batch, Address, PersistentPeerStoreProperties, PersistentPeerStoreOptions };
}
import PeerStore = require("..");
type PersistentPeerStoreProperties = {
    peerId: PeerId;
    datastore: import('interface-datastore').Datastore;
};
type PersistentPeerStoreOptions = {
    /**
     * - Number of dirty peers allowed before commit data.
     */
    threshold?: number | undefined;
};
type Batch = import('interface-datastore').Batch;
type Address = import('../address-book.js').Address;
//# sourceMappingURL=index.d.ts.map
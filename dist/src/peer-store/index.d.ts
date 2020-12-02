/// <reference types="node" />
export = PeerStore;
declare const PeerStore_base: typeof import("events").EventEmitter;
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
declare class PeerStore extends PeerStore_base {
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
        peerId: import("peer-id");
    });
    _peerId: import("peer-id");
    /**
     * AddressBook containing a map of peerIdStr to Address.
     */
    addressBook: import("./address-book");
    /**
     * KeyBook containing a map of peerIdStr to their PeerId with public keys.
     */
    keyBook: import("./key-book");
    /**
     * MetadataBook containing a map of peerIdStr to their metadata Map.
     */
    metadataBook: import("./metadata-book");
    /**
     * ProtoBook containing a map of peerIdStr to supported protocols.
     */
    protoBook: import("./proto-book");
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
    get peers(): Map<string, {
        /**
         * peer's peer-id instance.
         */
        id: import("peer-id");
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
    }>;
    /**
     * Delete the information of the given peer in every book.
     *
     * @param {PeerId} peerId
     * @returns {boolean} true if found and removed
     */
    delete(peerId: import("peer-id")): boolean;
    /**
     * Get the stored information of a given peer.
     *
     * @param {PeerId} peerId
     * @returns {Peer|undefined}
     */
    get(peerId: import("peer-id")): {
        /**
         * peer's peer-id instance.
         */
        id: import("peer-id");
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
    } | undefined;
}
declare namespace PeerStore {
    export { Address };
}
type Address = {
    /**
     * peer multiaddr.
     */
    multiaddr: import("multiaddr");
    /**
     * obtained from a signed peer record.
     */
    isCertified: boolean;
};
//# sourceMappingURL=index.d.ts.map
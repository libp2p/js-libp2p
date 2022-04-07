import type PeerId from 'peer-id';
import type { Multiaddr } from 'multiaddr';
import type Envelope from '../record/envelope';
import type { PublicKey } from 'libp2p-interfaces/src/keys/types';
export interface Address {
    /**
     * Peer multiaddr
     */
    multiaddr: Multiaddr;
    /**
     * Obtained from a signed peer record
     */
    isCertified: boolean;
}
export interface Peer {
    /**
     * Peer's peer-id instance
     */
    id: PeerId;
    /**
     * Peer's addresses containing its multiaddrs and metadata
     */
    addresses: Address[];
    /**
     * Peer's supported protocols
     */
    protocols: string[];
    /**
     * Peer's metadata map
     */
    metadata: Map<string, Uint8Array>;
    /**
     * May be set if the key that this Peer has is an RSA key
     */
    pubKey?: PublicKey;
    /**
     * The last peer record envelope received
     */
    peerRecordEnvelope?: Uint8Array;
}
export interface CertifiedRecord {
    raw: Uint8Array;
    seqNumber: number;
}
export interface AddressBookEntry {
    addresses: Address[];
    record: CertifiedRecord;
}
export interface Book<Type> {
    /**
     * Get the known data of a peer
     */
    get: (peerId: PeerId) => Promise<Type>;
    /**
     * Set the known data of a peer
     */
    set: (peerId: PeerId, data: Type) => Promise<void>;
    /**
     * Remove the known data of a peer
     */
    delete: (peerId: PeerId) => Promise<void>;
}
/**
 * AddressBook containing a map of peerIdStr to Address.
 */
export interface AddressBook {
    /**
     * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
     * This will return a boolean that indicates if the record was successfully processed and added
     * into the AddressBook
     */
    consumePeerRecord: (envelope: Envelope) => Promise<boolean>;
    /**
     * Get the raw Envelope for a peer. Returns
     * undefined if no Envelope is found
     */
    getRawEnvelope: (peerId: PeerId) => Promise<Uint8Array | undefined>;
    /**
     * Get an Envelope containing a PeerRecord for the given peer.
     * Returns undefined if no record exists.
     */
    getPeerRecord: (peerId: PeerId) => Promise<Envelope | undefined>;
    /**
     * Add known addresses of a provided peer.
     * If the peer is not known, it is set with the given addresses.
     */
    add: (peerId: PeerId, multiaddrs: Multiaddr[]) => Promise<void>;
    /**
     * Set the known addresses of a peer
     */
    set: (peerId: PeerId, data: Multiaddr[]) => Promise<void>;
    /**
     * Return the known addresses of a peer
     */
    get: (peerId: PeerId) => Promise<Address[]>;
    /**
     * Get the known multiaddrs for a given peer. All returned multiaddrs
     * will include the encapsulated `PeerId` of the peer.
     */
    getMultiaddrsForPeer: (peerId: PeerId, addressSorter?: (ms: Address[]) => Address[]) => Promise<Multiaddr[]>;
}
/**
 * KeyBook containing a map of peerIdStr to their PeerId with public keys.
 */
export interface KeyBook {
    /**
     * Get the known data of a peer
     */
    get: (peerId: PeerId) => Promise<PublicKey | undefined>;
    /**
     * Set the known data of a peer
     */
    set: (peerId: PeerId, data: PublicKey) => Promise<void>;
    /**
     * Remove the known data of a peer
     */
    delete: (peerId: PeerId) => Promise<void>;
}
/**
 * MetadataBook containing a map of peerIdStr to their metadata Map.
 */
export interface MetadataBook extends Book<Map<string, Uint8Array>> {
    /**
     * Set a specific metadata value
     */
    setValue: (peerId: PeerId, key: string, value: Uint8Array) => Promise<void>;
    /**
     * Get specific metadata value, if it exists
     */
    getValue: (peerId: PeerId, key: string) => Promise<Uint8Array | undefined>;
    /**
     * Deletes the provided peer metadata key from the book
     */
    deleteValue: (peerId: PeerId, key: string) => Promise<void>;
}
/**
 * ProtoBook containing a map of peerIdStr to supported protocols.
 */
export interface ProtoBook extends Book<string[]> {
    /**
     * Adds known protocols of a provided peer.
     * If the peer was not known before, it will be added.
     */
    add: (peerId: PeerId, protocols: string[]) => Promise<void>;
    /**
     * Removes known protocols of a provided peer.
     * If the protocols did not exist before, nothing will be done.
     */
    remove: (peerId: PeerId, protocols: string[]) => Promise<void>;
}
export interface PeerProtocolsChangeEvent {
    peerId: PeerId;
    protocols: string[];
}
export interface PeerMultiaddrsChangeEvent {
    peerId: PeerId;
    multiaddrs: Multiaddr[];
}
export interface PeerPublicKeyChangeEvent {
    peerId: PeerId;
    pubKey?: PublicKey;
}
export interface PeerMetadataChangeEvent {
    peerId: PeerId;
    metadata: Map<string, Uint8Array>;
}
export declare type EventName = 'peer' | 'change:protocols' | 'change:multiaddrs' | 'change:pubkey' | 'change:metadata';
export interface PeerStoreEvents {
    'peer': (event: PeerId) => void;
    'change:protocols': (event: PeerProtocolsChangeEvent) => void;
    'change:multiaddrs': (event: PeerMultiaddrsChangeEvent) => void;
    'change:pubkey': (event: PeerPublicKeyChangeEvent) => void;
    'change:metadata': (event: PeerMetadataChangeEvent) => void;
}
export interface PeerStore {
    addressBook: AddressBook;
    keyBook: KeyBook;
    metadataBook: MetadataBook;
    protoBook: ProtoBook;
    getPeers: () => AsyncIterable<Peer>;
    delete: (peerId: PeerId) => Promise<void>;
    has: (peerId: PeerId) => Promise<boolean>;
    get: (peerId: PeerId) => Promise<Peer>;
    on: <U extends keyof PeerStoreEvents>(event: U, listener: PeerStoreEvents[U]) => this;
    once: <U extends keyof PeerStoreEvents>(event: U, listener: PeerStoreEvents[U]) => this;
    emit: <U extends keyof PeerStoreEvents>(event: U, ...args: Parameters<PeerStoreEvents[U]>) => boolean;
}
export interface Store {
    has: (peerId: PeerId) => Promise<boolean>;
    save: (peer: Peer) => Promise<Peer>;
    load: (peerId: PeerId) => Promise<Peer>;
    merge: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>;
    mergeOrCreate: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>;
    patch: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>;
    patchOrCreate: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>;
    all: () => AsyncIterable<Peer>;
    lock: {
        readLock: () => Promise<() => void>;
        writeLock: () => Promise<() => void>;
    };
}
//# sourceMappingURL=types.d.ts.map
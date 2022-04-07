export = Dialer;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../peer-store/types').PeerStore} PeerStore
 * @typedef {import('../peer-store/types').Address} Address
 * @typedef {import('../transport-manager')} TransportManager
 * @typedef {import('../types').ConnectionGater} ConnectionGater
 */
/**
 * @typedef {Object} DialerProperties
 * @property {PeerStore} peerStore
 * @property {TransportManager} transportManager
 * @property {ConnectionGater} connectionGater
 *
 * @typedef {(addr:Multiaddr) => Promise<string[]>} Resolver
 *
 * @typedef {Object} DialerOptions
 * @property {(addresses: Address[]) => Address[]} [options.addressSorter = publicAddressesFirst] - Sort the known addresses of a peer before trying to dial.
 * @property {number} [maxParallelDials = MAX_PARALLEL_DIALS] - Number of max concurrent dials.
 * @property {number} [maxAddrsToDial = MAX_ADDRS_TO_DIAL] - Number of max addresses to dial for a given peer.
 * @property {number} [maxDialsPerPeer = MAX_PER_PEER_DIALS] - Number of max concurrent dials per peer.
 * @property {number} [dialTimeout = DIAL_TIMEOUT] - How long a dial attempt is allowed to take.
 * @property {Record<string, Resolver>} [resolvers = {}] - multiaddr resolvers to use when dialing
 * @property {import('../metrics')} [metrics]
 *
 * @typedef DialTarget
 * @property {string} id
 * @property {Multiaddr[]} addrs
 *
 * @typedef PendingDial
 * @property {import('./dial-request')} dialRequest
 * @property {import('timeout-abort-controller').TimeoutController} controller
 * @property {Promise<Connection>} promise
 * @property {function():void} destroy
 */
declare class Dialer {
    /**
     * @class
     * @param {DialerProperties & DialerOptions} options
     */
    constructor({ transportManager, peerStore, connectionGater, addressSorter, maxParallelDials, maxAddrsToDial, dialTimeout, maxDialsPerPeer, resolvers, metrics }: DialerProperties & DialerOptions);
    connectionGater: import("../types").ConnectionGater;
    transportManager: import("../transport-manager");
    peerStore: import("../peer-store/types").PeerStore;
    addressSorter: (addresses: Address[]) => Address[];
    maxParallelDials: number;
    maxAddrsToDial: number;
    timeout: number;
    maxDialsPerPeer: number;
    tokens: number[];
    /** @type {Map<string, PendingDial>} */
    _pendingDials: Map<string, PendingDial>;
    /** @type {Map<string, { resolve: (value: any) => void, reject: (err: Error) => void}>} */
    _pendingDialTargets: Map<string, {
        resolve: (value: any) => void;
        reject: (err: Error) => void;
    }>;
    /**
     * Clears any pending dials
     */
    destroy(): void;
    /**
     * Connects to a given `peer` by dialing all of its known addresses.
     * The dial to the first address that is successfully able to upgrade a connection
     * will be used.
     *
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @param {object} [options]
     * @param {AbortSignal} [options.signal] - An AbortController signal
     * @returns {Promise<Connection>}
     */
    connectToPeer(peer: PeerId | Multiaddr | string, options?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<Connection>;
    /**
     * Connects to a given `peer` by dialing all of its known addresses.
     * The dial to the first address that is successfully able to upgrade a connection
     * will be used.
     *
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @returns {Promise<DialTarget>}
     */
    _createCancellableDialTarget(peer: PeerId | Multiaddr | string): Promise<DialTarget>;
    /**
     * Creates a DialTarget. The DialTarget is used to create and track
     * the DialRequest to a given peer.
     * If a multiaddr is received it should be the first address attempted.
     * Multiaddrs not supported by the available transports will be filtered out.
     *
     * @private
     * @param {PeerId|Multiaddr|string} peer - A PeerId or Multiaddr
     * @returns {Promise<DialTarget>}
     */
    private _createDialTarget;
    /**
     * Creates a PendingDial that wraps the underlying DialRequest
     *
     * @private
     * @param {DialTarget} dialTarget
     * @param {object} [options]
     * @param {AbortSignal} [options.signal] - An AbortController signal
     * @returns {PendingDial}
     */
    private _createPendingDial;
    /**
     * @param {number} num
     */
    getTokens(num: number): number[];
    /**
     * @param {number} token
     */
    releaseToken(token: number): void;
    /**
     * Resolve multiaddr recursively.
     *
     * @param {Multiaddr} ma
     * @returns {Promise<Multiaddr[]>}
     */
    _resolve(ma: Multiaddr): Promise<Multiaddr[]>;
    /**
     * Resolve a given multiaddr. If this fails, an empty array will be returned
     *
     * @param {Multiaddr} ma
     * @returns {Promise<Multiaddr[]>}
     */
    _resolveRecord(ma: Multiaddr): Promise<Multiaddr[]>;
}
declare namespace Dialer {
    export { Connection, PeerId, PeerStore, Address, TransportManager, ConnectionGater, DialerProperties, Resolver, DialerOptions, DialTarget, PendingDial };
}
type PendingDial = {
    dialRequest: import('./dial-request');
    controller: import('timeout-abort-controller').TimeoutController;
    promise: Promise<Connection>;
    destroy: () => void;
};
type PeerId = import('peer-id');
import { Multiaddr } from "multiaddr";
type Connection = import("libp2p-interfaces/src/connection/connection");
type DialTarget = {
    id: string;
    addrs: Multiaddr[];
};
type DialerProperties = {
    peerStore: PeerStore;
    transportManager: TransportManager;
    connectionGater: ConnectionGater;
};
type DialerOptions = {
    /**
     * - Sort the known addresses of a peer before trying to dial.
     */
    addressSorter?: ((addresses: Address[]) => Address[]) | undefined;
    /**
     * - Number of max concurrent dials.
     */
    maxParallelDials?: number | undefined;
    /**
     * - Number of max addresses to dial for a given peer.
     */
    maxAddrsToDial?: number | undefined;
    /**
     * - Number of max concurrent dials per peer.
     */
    maxDialsPerPeer?: number | undefined;
    /**
     * - How long a dial attempt is allowed to take.
     */
    dialTimeout?: number | undefined;
    /**
     * - multiaddr resolvers to use when dialing
     */
    resolvers?: Record<string, Resolver> | undefined;
    metrics?: import("../metrics") | undefined;
};
type PeerStore = import('../peer-store/types').PeerStore;
type Address = import('../peer-store/types').Address;
type TransportManager = import('../transport-manager');
type ConnectionGater = import('../types').ConnectionGater;
type Resolver = (addr: Multiaddr) => Promise<string[]>;
//# sourceMappingURL=index.d.ts.map
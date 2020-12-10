export = Libp2p;
/**
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('libp2p-interfaces/src/transport/types').TransportFactory} TransportFactory
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory} MuxerFactory
 * @typedef {import('libp2p-interfaces/src/crypto/types').Crypto} Crypto
 * @typedef {import('libp2p-interfaces/src/pubsub')} Pubsub
 */
/**
 * @typedef {Object} PeerStoreOptions
 * @property {boolean} persistence
 *
 * @typedef {Object} PeerDiscoveryOptions
 * @property {boolean} autoDial
 *
 * @typedef {Object} RelayOptions
 * @property {boolean} enabled
 * @property {import('./circuit').RelayAdvertiseOptions} advertise
 * @property {import('./circuit').HopOptions} hop
 * @property {import('./circuit').AutoRelayOptions} autoRelay
 *
 * @typedef {Object} Libp2pConfig
 * @property {Object} [dht] dht module options
 * @property {PeerDiscoveryOptions} [peerDiscovery]
 * @property {Pubsub} [pubsub] pubsub module options
 * @property {RelayOptions} [relay]
 * @property {Record<string, Object>} [transport] transport options indexed by transport key
 *
 * @typedef {Object} Libp2pModules
 * @property {TransportFactory[]} transport
 * @property {MuxerFactory[]} streamMuxer
 * @property {Crypto[]} connEncryption
 *
 * @typedef {Object} Libp2pOptions
 * @property {Libp2pModules} modules libp2p modules to use
 * @property {import('./address-manager').AddressManagerOptions} [addresses]
 * @property {import('./connection-manager').ConnectionManagerOptions} [connectionManager]
 * @property {import('./dialer').DialerOptions} [dialer]
 * @property {import('./metrics').MetricsOptions} [metrics]
 * @property {Object} [keychain]
 * @property {import('./transport-manager').TransportManagerOptions} [transportManager]
 * @property {PeerStoreOptions & import('./peer-store/persistent').PersistentPeerStoreOptions} [peerStore]
 * @property {Libp2pConfig} [config]
 * @property {PeerId} peerId
 *
 * @extends {EventEmitter}
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 */
declare class Libp2p extends EventEmitter {
    /**
     * Libp2p node.
     *
     * @class
     * @param {Libp2pOptions} _options
     */
    constructor(_options: Libp2pOptions);
    _options: any;
    /** @type {PeerId} */
    peerId: PeerId;
    datastore: any;
    peerStore: PeerStore;
    addresses: any;
    addressManager: AddressManager;
    _modules: any;
    _config: any;
    _transport: any[];
    _discovery: Map<any, any>;
    connectionManager: ConnectionManager;
    metrics: Metrics | undefined;
    keychain: Keychain | undefined;
    upgrader: Upgrader;
    transportManager: TransportManager;
    registrar: Registrar;
    /**
     * Registers the `handler` for each protocol
     *
     * @param {string[]|string} protocols
     * @param {({ connection: Connection, stream: MuxedStream, protocol: string }) => void} handler
     */
    handle(protocols: string[] | string, handler: ({ connection: Connection, stream: MuxedStream, protocol: string }: {
        connection: any;
        stream: any;
        protocol: any;
    }) => void): void;
    dialer: Dialer;
    relay: Relay | undefined;
    identifyService: IdentifyService | undefined;
    _dht: any;
    /** @type {Pubsub} */
    pubsub: import("libp2p-interfaces/src/pubsub");
    peerRouting: PeerRouting;
    contentRouting: ContentRouting;
    /**
     * Called whenever peer discovery services emit `peer` events.
     * Known peers may be emitted.
     *
     * @private
     * @param {{ id: PeerId, multiaddrs: Multiaddr[], protocols: string[] }} peer
     */
    private _onDiscoveryPeer;
    /**
     * Starts the libp2p node and all its subsystems
     *
     * @returns {Promise<void>}
     */
    start(): Promise<void>;
    /**
     * Stop the libp2p node by closing its listeners and open connections
     *
     * @async
     * @returns {Promise<void>}
     */
    stop(): Promise<void>;
    _isStarted: boolean | undefined;
    /**
     * Load keychain keys from the datastore.
     * Imports the private key as 'self', if needed.
     *
     * @async
     * @returns {Promise<void>}
     */
    loadKeychain(): Promise<void>;
    isStarted(): boolean | undefined;
    /**
     * Gets a Map of the current connections. The keys are the stringified
     * `PeerId` of the peer. The value is an array of Connections to that peer.
     *
     * @returns {Map<string, Connection[]>}
     */
    get connections(): Map<string, import("libp2p-interfaces/src/connection/connection")[]>;
    /**
     * Dials to the provided peer. If successful, the known metadata of the
     * peer will be added to the nodes `peerStore`
     *
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @returns {Promise<Connection>}
     */
    dial(peer: PeerId | Multiaddr | string, options?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<Connection>;
    /**
     * Dials to the provided peer and handshakes with the given protocol.
     * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
     * and the `Connection` will be returned
     *
     * @async
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @param {string[]|string} protocols
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @returns {Promise<Connection|*>}
     */
    dialProtocol(peer: PeerId | Multiaddr | string, protocols: string[] | string, options?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<Connection | any>;
    /**
     * Get peer advertising multiaddrs by concating the addresses used
     * by transports to listen with the announce addresses.
     * Duplicated addresses and noAnnounce addresses are filtered out.
     *
     * @returns {Multiaddr[]}
     */
    get multiaddrs(): import("multiaddr")[];
    /**
     * Disconnects all connections to the given `peer`
     *
     * @param {PeerId|Multiaddr|string} peer - the peer to close connections to
     * @returns {Promise<void>}
     */
    hangUp(peer: PeerId | Multiaddr | string): Promise<void>;
    /**
     * Pings the given peer in order to obtain the operation latency.
     *
     * @param {PeerId|Multiaddr|string} peer - The peer to ping
     * @returns {Promise<number>}
     */
    ping(peer: PeerId | Multiaddr | string): Promise<number>;
    /**
     * Removes the handler for each protocol. The protocol
     * will no longer be supported on streams.
     *
     * @param {string[]|string} protocols
     */
    unhandle(protocols: string[] | string): void;
    _onStarting(): Promise<void>;
    /**
     * Called when libp2p has started and before it returns
     *
     * @private
     */
    private _onDidStart;
    /**
     * Will dial to the given `peerId` if the current number of
     * connected peers is less than the configured `ConnectionManager`
     * minConnections.
     *
     * @private
     * @param {PeerId} peerId
     */
    private _maybeConnect;
    /**
     * Initializes and starts peer discovery services
     *
     * @async
     * @private
     */
    private _setupPeerDiscovery;
}
declare namespace Libp2p {
    export { create, Multiaddr, Connection, MuxedStream, TransportFactory, MuxerFactory, Crypto, Pubsub, PeerStoreOptions, PeerDiscoveryOptions, RelayOptions, Libp2pConfig, Libp2pModules, Libp2pOptions, CreateOptions };
}
import { EventEmitter } from "node/events";
import PeerId = require("peer-id");
import PeerStore = require("./peer-store");
import AddressManager = require("./address-manager");
import ConnectionManager = require("./connection-manager");
import Metrics = require("./metrics");
import Keychain = require("./keychain");
import Upgrader = require("./upgrader");
import TransportManager = require("./transport-manager");
import Registrar = require("./registrar");
import Dialer = require("./dialer");
import Relay = require("./circuit");
import IdentifyService = require("./identify");
import PeerRouting = require("./peer-routing");
import ContentRouting = require("./content-routing");
type Multiaddr = import("multiaddr");
type Connection = import("libp2p-interfaces/src/connection/connection");
type Libp2pOptions = {
    /**
     * libp2p modules to use
     */
    modules: Libp2pModules;
    addresses?: AddressManager.AddressManagerOptions | undefined;
    connectionManager?: ConnectionManager.ConnectionManagerOptions | undefined;
    dialer?: Dialer.DialerOptions | undefined;
    metrics?: Metrics.MetricsOptions | undefined;
    keychain?: any;
    transportManager?: TransportManager.TransportManagerOptions | undefined;
    peerStore?: (PeerStoreOptions & PersistentPeerStore.PersistentPeerStoreOptions) | undefined;
    config?: Libp2pConfig | undefined;
    peerId: PeerId;
};
declare function create(options: Libp2pOptions & CreateOptions): Promise<Libp2p>;
type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
type TransportFactory = import("libp2p-interfaces/src/transport/types").TransportFactory<any, any>;
type MuxerFactory = import("libp2p-interfaces/src/stream-muxer/types").MuxerFactory;
type Crypto = import("libp2p-interfaces/src/crypto/types").Crypto;
type Pubsub = import("libp2p-interfaces/src/pubsub");
type PeerStoreOptions = {
    persistence: boolean;
};
type PeerDiscoveryOptions = {
    autoDial: boolean;
};
type RelayOptions = {
    enabled: boolean;
    advertise: import('./circuit').RelayAdvertiseOptions;
    hop: import('./circuit').HopOptions;
    autoRelay: import('./circuit').AutoRelayOptions;
};
type Libp2pConfig = {
    /**
     * dht module options
     */
    dht?: any;
    peerDiscovery?: PeerDiscoveryOptions | undefined;
    /**
     * pubsub module options
     */
    pubsub?: import("libp2p-interfaces/src/pubsub") | undefined;
    relay?: RelayOptions | undefined;
    /**
     * transport options indexed by transport key
     */
    transport?: Record<string, any> | undefined;
};
type Libp2pModules = {
    transport: import("libp2p-interfaces/src/transport/types").TransportFactory<any, any>[];
    streamMuxer: MuxerFactory[];
    connEncryption: Crypto[];
};
type CreateOptions = {
    peerId: PeerId;
};
import PersistentPeerStore = require("./peer-store/persistent");
//# sourceMappingURL=index.d.ts.map
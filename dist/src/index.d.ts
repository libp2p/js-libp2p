export = Libp2p;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>} TransportFactory
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory} MuxerFactory
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 * @typedef {import('libp2p-interfaces/src/peer-discovery/types').PeerDiscoveryFactory} PeerDiscoveryFactory
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 * @typedef {import('libp2p-interfaces/src/crypto/types').Crypto} Crypto
 * @typedef {import('libp2p-interfaces/src/pubsub')} Pubsub
 * @typedef {import('libp2p-interfaces/src/pubsub').PubsubOptions} PubsubOptions
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('./pnet')} Protector
 * @typedef {import('./types').ConnectionGater} ConnectionGater
 * @typedef {Object} PersistentPeerStoreOptions
 * @property {number} [threshold]
 */
/**
 * @typedef {Object} HandlerProps
 * @property {Connection} connection
 * @property {MuxedStream} stream
 * @property {string} protocol
 *
 * @typedef {Object} DhtOptions
 * @property {boolean} [enabled = false]
 * @property {number} [kBucketSize = 20]
 * @property {boolean} [clientMode]
 * @property {import('libp2p-interfaces/src/types').DhtSelectors} [selectors]
 * @property {import('libp2p-interfaces/src/types').DhtValidators} [validators]
 *
 * @typedef {Object} KeychainOptions
 * @property {Datastore} [datastore]
 *
 * @typedef {Object} PeerStoreOptions
 * @property {boolean} persistence
 *
 * @typedef {Object} PubsubLocalOptions
 * @property {boolean} enabled
 *
 * @typedef {Object} MetricsOptions
 * @property {boolean} enabled
 *
 * @typedef {Object} RelayOptions
 * @property {boolean} [enabled = true]
 * @property {import('./circuit').RelayAdvertiseOptions} [advertise]
 * @property {import('./circuit').HopOptions} [hop]
 * @property {import('./circuit').AutoRelayOptions} [autoRelay]
 *
 * @typedef {Object} Libp2pConfig
 * @property {DhtOptions} [dht] dht module options
 * @property {import('./nat-manager').NatManagerOptions} [nat]
 * @property {Record<string, Object|boolean>} [peerDiscovery]
 * @property {PubsubLocalOptions & PubsubOptions} [pubsub] pubsub module options
 * @property {RelayOptions} [relay]
 * @property {Record<string, Object>} [transport] transport options indexed by transport key
 *
 * @typedef {Object} Libp2pModules
 * @property {TransportFactory[]} transport
 * @property {MuxerFactory[]} streamMuxer
 * @property {Crypto[]} connEncryption
 * @property {PeerDiscoveryFactory[]} [peerDiscovery]
 * @property {PeerRoutingModule[]} [peerRouting]
 * @property {ContentRoutingModule[]} [contentRouting]
 * @property {Object} [dht]
 * @property {{new(...args: any[]): Pubsub}} [pubsub]
 * @property {Protector} [connProtector]
 *
 * @typedef {Object} Libp2pOptions
 * @property {Libp2pModules} modules libp2p modules to use
 * @property {import('./address-manager').AddressManagerOptions} [addresses]
 * @property {import('./connection-manager').ConnectionManagerOptions} [connectionManager]
 * @property {Partial<import('./types').ConnectionGater>} [connectionGater]
 * @property {Datastore} [datastore]
 * @property {import('./dialer').DialerOptions} [dialer]
 * @property {import('./identify/index').HostProperties} [host] libp2p host
 * @property {KeychainOptions & import('./keychain/index').KeychainOptions} [keychain]
 * @property {MetricsOptions & import('./metrics').MetricsOptions} [metrics]
 * @property {import('./peer-routing').PeerRoutingOptions} [peerRouting]
 * @property {PeerStoreOptions} [peerStore]
 * @property {import('./transport-manager').TransportManagerOptions} [transportManager]
 * @property {Libp2pConfig} [config]
 *
 * @typedef {Object} constructorOptions
 * @property {PeerId} peerId
 *
 * @typedef {Object} CreateOptions
 * @property {PeerId} [peerId]
 *
 * @extends {EventEmitter}
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 */
declare class Libp2p extends EventEmitter {
    /**
     * Like `new Libp2p(options)` except it will create a `PeerId`
     * instance if one is not provided in options.
     *
     * @param {Libp2pOptions & CreateOptions} options - Libp2p configuration options
     * @returns {Promise<Libp2p>}
     */
    static create(options: Libp2pOptions & CreateOptions): Promise<Libp2p>;
    /**
     * Libp2p node.
     *
     * @class
     * @param {Libp2pOptions & constructorOptions} _options
     */
    constructor(_options: Libp2pOptions & constructorOptions);
    _options: {
        addresses: {
            listen: never[];
            announce: never[];
            noAnnounce: never[];
            announceFilter: (multiaddrs: Multiaddr[]) => Multiaddr[];
        };
        connectionManager: {
            minConnections: number;
        };
        connectionGater: {};
        transportManager: {
            faultTolerance: number;
        };
        dialer: {
            maxParallelDials: number;
            maxDialsPerPeer: number;
            dialTimeout: number;
            resolvers: {
                dnsaddr: any;
            };
            addressSorter: typeof import("libp2p-utils/src/address-sort").publicAddressesFirst;
        };
        host: {
            agentVersion: string;
        };
        metrics: {
            enabled: boolean;
        };
        peerStore: {
            persistence: boolean;
            threshold: number;
        };
        peerRouting: {
            refreshManager: {
                enabled: boolean;
                interval: number;
                bootDelay: number;
            };
        };
        config: {
            protocolPrefix: string;
            dht: {
                enabled: boolean;
                kBucketSize: number;
            };
            nat: {
                enabled: boolean;
                ttl: number;
                keepAlive: boolean;
                gateway: null;
                externalIp: null;
                pmp: {
                    enabled: boolean;
                };
            };
            peerDiscovery: {
                autoDial: boolean;
            };
            pubsub: {
                enabled: boolean;
            };
            relay: {
                enabled: boolean;
                advertise: {
                    bootDelay: number;
                    enabled: boolean;
                    ttl: number;
                };
                hop: {
                    enabled: boolean;
                    active: boolean;
                };
                autoRelay: {
                    enabled: boolean;
                    maxListeners: number;
                };
            };
            transport: {};
        };
    } & Libp2pOptions & constructorOptions;
    /** @type {PeerId} */
    peerId: PeerId;
    datastore: import("interface-datastore").Datastore | undefined;
    metrics: Metrics | undefined;
    /** @type {ConnectionGater} */
    connectionGater: ConnectionGater;
    /** @type {import('./peer-store/types').PeerStore} */
    peerStore: import('./peer-store/types').PeerStore;
    addresses: {
        listen: never[];
        announce: never[];
        noAnnounce: never[];
        announceFilter: (multiaddrs: Multiaddr[]) => Multiaddr[];
    } & AddressManager.AddressManagerOptions;
    addressManager: AddressManager;
    _modules: Libp2pModules;
    _config: {
        protocolPrefix: string;
        dht: {
            enabled: boolean;
            kBucketSize: number;
        };
        nat: {
            enabled: boolean;
            ttl: number;
            keepAlive: boolean;
            gateway: null;
            externalIp: null;
            pmp: {
                enabled: boolean;
            };
        };
        peerDiscovery: {
            autoDial: boolean;
        };
        pubsub: {
            enabled: boolean;
        };
        relay: {
            enabled: boolean;
            advertise: {
                bootDelay: number;
                enabled: boolean;
                ttl: number;
            };
            hop: {
                enabled: boolean;
                active: boolean;
            };
            autoRelay: {
                enabled: boolean;
                maxListeners: number;
            };
        };
        transport: {};
    } & Libp2pConfig;
    _transport: any[];
    _discovery: Map<any, any>;
    connectionManager: ConnectionManager;
    _autodialler: AutoDialler;
    keychain: Keychain | undefined;
    upgrader: Upgrader;
    transportManager: TransportManager;
    natManager: NatManager;
    registrar: Registrar;
    /**
     * Registers the `handler` for each protocol
     *
     * @param {string[]|string} protocols
     * @param {(props: HandlerProps) => void} handler
     */
    handle(protocols: string[] | string, handler: (props: HandlerProps) => void): Promise<void>;
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
    fetchService: FetchService;
    pingService: PingService;
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
     * Dials to the provided peer and tries to handshake with the given protocols in order.
     * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
     * and the `MuxedStream` will be returned together with the successful negotiated protocol.
     *
     * @async
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @param {string[]|string} protocols
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     */
    dialProtocol(peer: PeerId | Multiaddr | string, protocols: string[] | string, options?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<{
        stream: import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
        protocol: string;
    }>;
    /**
     * @async
     * @param {PeerId|Multiaddr|string} peer - The peer to dial
     * @param {object} [options]
     * @returns {Promise<Connection>}
     */
    _dial(peer: PeerId | Multiaddr | string, options?: object | undefined): Promise<Connection>;
    /**
     * Get a deduplicated list of peer advertising multiaddrs by concatenating
     * the listen addresses used by transports with any configured
     * announce addresses as well as observed addresses reported by peers.
     *
     * If Announce addrs are specified, configured listen addresses will be
     * ignored though observed addresses will still be included.
     *
     * @returns {Multiaddr[]}
     */
    get multiaddrs(): Multiaddr[];
    /**
     * Disconnects all connections to the given `peer`
     *
     * @param {PeerId|Multiaddr|string} peer - the peer to close connections to
     * @returns {Promise<void>}
     */
    hangUp(peer: PeerId | Multiaddr | string): Promise<void>;
    /**
     * Sends a request to fetch the value associated with the given key from the given peer.
     *
     * @param {PeerId|Multiaddr} peer
     * @param {string} key
     * @returns {Promise<Uint8Array | null>}
     */
    fetch(peer: PeerId | Multiaddr, key: string): Promise<Uint8Array | null>;
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
    unhandle(protocols: string[] | string): Promise<void>;
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
    export { Connection, MuxedStream, TransportFactory, MuxerFactory, ContentRoutingModule, PeerDiscoveryFactory, PeerRoutingModule, Crypto, Pubsub, PubsubOptions, Datastore, Protector, ConnectionGater, PersistentPeerStoreOptions, HandlerProps, DhtOptions, KeychainOptions, PeerStoreOptions, PubsubLocalOptions, MetricsOptions, RelayOptions, Libp2pConfig, Libp2pModules, Libp2pOptions, constructorOptions, CreateOptions };
}
import { EventEmitter } from "events";
type Libp2pOptions = {
    /**
     * libp2p modules to use
     */
    modules: Libp2pModules;
    addresses?: AddressManager.AddressManagerOptions | undefined;
    connectionManager?: ConnectionManager.ConnectionManagerOptions | undefined;
    connectionGater?: Partial<import("./types").ConnectionGater> | undefined;
    datastore?: import("interface-datastore").Datastore | undefined;
    dialer?: Dialer.DialerOptions | undefined;
    /**
     * libp2p host
     */
    host?: IdentifyService.HostProperties | undefined;
    keychain?: (KeychainOptions & Keychain.KeychainOptions) | undefined;
    metrics?: (MetricsOptions & Metrics.MetricsOptions) | undefined;
    peerRouting?: PeerRouting.PeerRoutingOptions | undefined;
    peerStore?: PeerStoreOptions | undefined;
    transportManager?: TransportManager.TransportManagerOptions | undefined;
    config?: Libp2pConfig | undefined;
};
type constructorOptions = {
    peerId: PeerId;
};
import PeerId = require("peer-id");
import Metrics = require("./metrics");
type ConnectionGater = import('./types').ConnectionGater;
import AddressManager = require("./address-manager");
type Libp2pModules = {
    transport: import("libp2p-interfaces/src/transport/types").TransportFactory<any, any>[];
    streamMuxer: MuxerFactory[];
    connEncryption: Crypto[];
    peerDiscovery?: import("libp2p-interfaces/src/peer-discovery/types").PeerDiscoveryFactory[] | undefined;
    peerRouting?: import("libp2p-interfaces/src/peer-routing/types").PeerRouting[] | undefined;
    contentRouting?: import("libp2p-interfaces/src/content-routing/types").ContentRouting[] | undefined;
    dht?: Object | undefined;
    pubsub?: (new (...args: any[]) => Pubsub) | undefined;
    connProtector?: import("./pnet") | undefined;
};
type Libp2pConfig = {
    /**
     * dht module options
     */
    dht?: DhtOptions | undefined;
    nat?: NatManager.NatManagerOptions | undefined;
    peerDiscovery?: Record<string, boolean | Object> | undefined;
    /**
     * pubsub module options
     */
    pubsub?: (PubsubLocalOptions & import("libp2p-interfaces/src/pubsub").PubsubOptions) | undefined;
    relay?: RelayOptions | undefined;
    /**
     * transport options indexed by transport key
     */
    transport?: Record<string, Object> | undefined;
};
import ConnectionManager = require("./connection-manager");
import AutoDialler = require("./connection-manager/auto-dialler");
import Keychain = require("./keychain");
import Upgrader = require("./upgrader");
import TransportManager = require("./transport-manager");
import NatManager = require("./nat-manager");
import Registrar = require("./registrar");
type HandlerProps = {
    connection: Connection;
    stream: MuxedStream;
    protocol: string;
};
import Dialer = require("./dialer");
import Relay = require("./circuit");
import IdentifyService = require("./identify");
import PeerRouting = require("./peer-routing");
import ContentRouting = require("./content-routing");
import FetchService = require("./fetch");
import PingService = require("./ping");
import { Multiaddr } from "multiaddr";
type Connection = import("libp2p-interfaces/src/connection/connection");
type CreateOptions = {
    peerId?: PeerId | undefined;
};
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
type TransportFactory = import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>;
type MuxerFactory = import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory;
type ContentRoutingModule = import('libp2p-interfaces/src/content-routing/types').ContentRouting;
type PeerDiscoveryFactory = import('libp2p-interfaces/src/peer-discovery/types').PeerDiscoveryFactory;
type PeerRoutingModule = import('libp2p-interfaces/src/peer-routing/types').PeerRouting;
type Crypto = import('libp2p-interfaces/src/crypto/types').Crypto;
type Pubsub = import('libp2p-interfaces/src/pubsub');
type PubsubOptions = import('libp2p-interfaces/src/pubsub').PubsubOptions;
type Datastore = import('interface-datastore').Datastore;
type Protector = import('./pnet');
type PersistentPeerStoreOptions = {
    threshold?: number | undefined;
};
type DhtOptions = {
    enabled?: boolean | undefined;
    kBucketSize?: number | undefined;
    clientMode?: boolean | undefined;
    selectors?: import("libp2p-interfaces/src/types").DhtSelectors | undefined;
    validators?: import("libp2p-interfaces/src/types").DhtValidators | undefined;
};
type KeychainOptions = {
    datastore?: import("interface-datastore").Datastore | undefined;
};
type PeerStoreOptions = {
    persistence: boolean;
};
type PubsubLocalOptions = {
    enabled: boolean;
};
type MetricsOptions = {
    enabled: boolean;
};
type RelayOptions = {
    enabled?: boolean | undefined;
    advertise?: Relay.RelayAdvertiseOptions | undefined;
    hop?: Relay.HopOptions | undefined;
    autoRelay?: Relay.AutoRelayOptions | undefined;
};
//# sourceMappingURL=index.d.ts.map
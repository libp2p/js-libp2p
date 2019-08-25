/**
 * @class Dialer
 *
 */
declare class Dialer {
    /**
     * Helper that returns a relay connection
     *
     * @param {*} relay
     * @param {*} callback
     * @returns {Function} - callback
     */
    _dialRelayHelper(relay: any, callback: any): (...params: any[]) => any;
    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to dial
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     */
    dial(ma: multiaddr, cb: (...params: any[]) => any): Connection;
    /**
     * Does the peer support the HOP protocol
     *
     * @param {PeerInfo} peer
     * @param {Function} callback
     * @returns {void}
     */
    canHop(peer: PeerInfo, callback: (...params: any[]) => any): void;
    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to dial
     * @param {Object} options - dial options
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     * @memberOf Dialer
     */
    static Circuit#dial(ma: multiaddr, options: any, cb: (...params: any[]) => any): Connection;
    /**
     * Filter check for all multiaddresses
     * that this transport can dial on
     *
     * @param {any} multiaddrs
     * @returns {Array<multiaddr>}
     *
     * @memberOf Dialer
     */
    static Circuit#filter(multiaddrs: any): multiaddr[];
}

/**
 * @class Dialer
 *
 */
declare class Dialer {
    /**
     * Helper that returns a relay connection
     *
     * @param {*} relay
     * @param {*} callback
     * @returns {Function} - callback
     */
    _dialRelayHelper(relay: any, callback: any): (...params: any[]) => any;
    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to dial
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     */
    dial(ma: multiaddr, cb: (...params: any[]) => any): Connection;
    /**
     * Does the peer support the HOP protocol
     *
     * @param {PeerInfo} peer
     * @param {Function} callback
     * @returns {void}
     */
    canHop(peer: PeerInfo, callback: (...params: any[]) => any): void;
    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to dial
     * @param {Object} options - dial options
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     * @memberOf Dialer
     */
    static Circuit#dial(ma: multiaddr, options: any, cb: (...params: any[]) => any): Connection;
    /**
     * Filter check for all multiaddresses
     * that this transport can dial on
     *
     * @param {any} multiaddrs
     * @returns {Array<multiaddr>}
     *
     * @memberOf Dialer
     */
    static Circuit#filter(multiaddrs: any): multiaddr[];
}

/**
 * Construct a Circuit object
 *
 * This class will handle incoming circuit connections and
 * either start a relay or hand the relayed connection to
 * the swarm
 *
 * @param {Swarm} swarm
 * @param {Object} options
 */
declare class Hop {
    constructor(swarm: Swarm, options: any);
    /**
     * Handle the relay message
     *
     * @param {CircuitRelay} message
     * @param {StreamHandler} sh
     * @returns {*}
     */
    handle(message: CircuitRelay, sh: StreamHandler): any;
    /**
     * Connect to STOP
     *
     * @param {PeerInfo} peer
     * @param {StreamHandler} srcSh
     * @param {function} callback
     * @returns {void}
     */
    _connectToStop(peer: PeerInfo, srcSh: StreamHandler, callback: (...params: any[]) => any): void;
    /**
     * Negotiate STOP
     *
     * @param {StreamHandler} dstSh
     * @param {StreamHandler} srcSh
     * @param {CircuitRelay} message
     * @param {function} callback
     * @returns {void}
     */
    _negotiateStop(dstSh: StreamHandler, srcSh: StreamHandler, message: CircuitRelay, callback: (...params: any[]) => any): void;
}

declare class Stop extends EventEmitter {
    /**
     * Handle the incoming STOP message
     *
     * @param {{}} msg  - the parsed protobuf message
     * @param {StreamHandler} sh  - the stream handler wrapped connection
     * @param {Function} callback  - callback
     * @returns {undefined}
     */
    handle(msg: any, sh: StreamHandler, callback: (...params: any[]) => any): undefined;
}

/**
 * Create a stream handler for connection
 *
 * @param {Connection} conn - connection to read/write
 * @param {Function|undefined} cb - handshake callback called on error
 * @param {Number} timeout - handshake timeout
 * @param {Number} maxLength - max bytes length of message
 */
declare class StreamHandler {
    constructor(conn: Connection, cb: ((...params: any[]) => any) | undefined, timeout: number, maxLength: number);
    /**
     * Read and decode message
     *
     * @param {Function} cb
     * @returns {void|Function}
     */
    read(cb: (...params: any[]) => any): void | ((...params: any[]) => any);
    /**
     * Encode and write array of buffers
     *
     * @param {Buffer[]} msg
     * @param {Function} [cb]
     * @returns {Function}
     */
    write(msg: Buffer[], cb?: (...params: any[]) => any): (...params: any[]) => any;
    /**
     * Get the raw Connection
     *
     * @returns {null|Connection|*}
     */
    getRawConn(): null | Connection | any;
    /**
     * Return the handshake rest stream and invalidate handler
     *
     * @return {*|{source, sink}}
     */
    rest(): any | any;
    /**
     * Close the stream
     *
     * @returns {undefined}
     */
    close(): undefined;
}

/**
 * Utils
 *
 */
declare function utils(): void;

/** @class Circuit
 */
declare class Circuit {
    /**
     * Dial the relays in the Addresses.Swarm config
     *
     * @param {Array} relays
     * @return {void}
     */
    _dialSwarmRelays(relays: Array): void;
    /**
     * Create a listener
     *
     * @param {any} options
     * @param {Function} handler
     * @return {listener}
     */
    createListener(options: any, handler: (...params: any[]) => any): listener;
}

declare namespace Dialer {
    /**
     * Creates an instance of Dialer.
     *
     * @param {Swarm} swarm - the swarm
     * @param {any} options - config options
     *
     * @memberOf Dialer
     */
    class Circuit {
        constructor(swarm: Swarm, options: any);
    }
}

/**
 * @method
 *
 * @param {@} swarm
 * @param {*} options
 * @param {*} connHandler
 * @returns {EventEmitter}
 */
declare function listener({@}: any, options: any, connHandler: any): EventEmitter;

/**
 * @method
 * @param {*} node
 */
declare function router(node: any): void;

/**
 * Iterates over all content routers in series to find providers of the given key.
 * Once a content router succeeds, iteration will stop.
 *
 * @method
 * @param {CID} key The CID key of the content to find
 * @param {object} options
 * @param {number} options.maxTimeout How long the query should run
 * @param {number} options.maxNumProviders - maximum number of providers to find
 * @param {function(Error, Result<Array>)} callback
 * @promise {void}
 */
declare function findProviders(key: CID, options: {
    maxTimeout: number;
    maxNumProviders: number;
}, callback: (...params: any[]) => any): void;

/**
 * Iterates over all content routers in parallel to notify it is
 * a provider of the given key.
 *
 * @method
 * @param {CID} key The CID key of the content to find
 * @param {function(Error)} callback
 * @returns {void}
 */
declare function provide(key: CID, callback: (...params: any[]) => any): void;

/**
 * Converts the given `peer` to a `PeerInfo` instance.
 * The `PeerBook` will be checked for the resulting peer, and
 * the peer will be updated in the `PeerBook`.
 *
 * @param {PeerInfo|PeerId|Multiaddr|string} peer
 * @param {PeerBook} peerBook
 * @returns {PeerInfo}
 */
declare function getPeerInfo(peer: PeerInfo | PeerId | Multiaddr | string, peerBook: PeerBook): PeerInfo;

/**
 * If `getPeerInfo` does not return a peer with multiaddrs,
 * the `libp2p` PeerRouter will be used to attempt to find the peer.
 *
 * @async
 * @param {PeerInfo|PeerId|Multiaddr|string} peer
 * @param {Libp2p} libp2p
 * @returns {Promise<PeerInfo>}
 */
declare function getPeerInfoRemote(peer: PeerInfo | PeerId | Multiaddr | string, libp2p: Libp2p): Promise<PeerInfo>;

declare class Libp2p {
    /**
     * Overrides EventEmitter.emit to conditionally emit errors
     * if there is a handler. If not, errors will be logged.
     * @param {string} eventName
     * @param  {...any} args
     * @returns {void}
     */
    emit(eventName: string, ...args: any[]): void;
    /**
     * Starts the libp2p node and all sub services
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    start(callback: (...params: any[]) => any): void;
    /**
     * Stop the libp2p node by closing its listeners and open connections
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    stop(callback: (...params: any[]) => any): void;
    /**
     * Dials to the provided peer. If successful, the `PeerInfo` of the
     * peer will be added to the nodes `PeerBook`
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {function(Error)} callback
     * @returns {void}
     */
    dial(peer: PeerInfo | PeerId | Multiaddr | string, callback: (...params: any[]) => any): void;
    /**
     * Dials to the provided peer and handshakes with the given protocol.
     * If successful, the `PeerInfo` of the peer will be added to the nodes `PeerBook`,
     * and the `Connection` will be sent in the callback
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {string} protocol
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    dialProtocol(peer: PeerInfo | PeerId | Multiaddr | string, protocol: string, callback: (...params: any[]) => any): void;
    /**
     * Similar to `dial` and `dialProtocol`, but the callback will contain a
     * Connection State Machine.
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {string} protocol
     * @param {function(Error, ConnectionFSM)} callback
     * @returns {void}
     */
    dialFSM(peer: PeerInfo | PeerId | Multiaddr | string, protocol: string, callback: (...params: any[]) => any): void;
    /**
     * Disconnects from the given peer
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
     * @param {function(Error)} callback
     * @returns {void}
     */
    hangUp(peer: PeerInfo | PeerId | Multiaddr | string, callback: (...params: any[]) => any): void;
    /**
     * Pings the provided peer
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
     * @param {function(Error, Ping)} callback
     * @returns {void}
     */
    ping(peer: PeerInfo | PeerId | Multiaddr | string, callback: (...params: any[]) => any): void;
}

/**
 * Like `new Libp2p(options)` except it will create a `PeerInfo`
 * instance if one is not provided in options.
 *
 * @method
 * @param {object} options Libp2p configuration options
 * @param {function(Error, Libp2p)} callback
 * @return {Promise<{void}>}
 */
declare function createLibp2p(options: any, callback: (...params: any[]) => any): Promise<{ void: any; }>;

/**
 * Iterates over all peer routers in series to find the given peer.
 *
 * @method
 * @param {String} id The id of the peer to find
 * @param {object} options
 * @param {number} options.maxTimeout How long the query should run
 * @param {function(Error, Result<Array>)} callback
 * @returns {void}
 */
declare function findPeer(id: string, options: {
    maxTimeout: number;
}, callback: (...params: any[]) => any): void;

/**
 * Creates a pull stream to encrypt messages in a private network
 *
 * @param {Buffer} nonce The nonce to use in encryption
 * @param {Buffer} psk The private shared key to use in encryption
 * @returns {PullStream} a through stream
 */
declare function createBoxStream(nonce: Buffer, psk: Buffer): PullStream;

/**
 * Creates a pull stream to decrypt messages in a private network
 *
 * @param {Object} remote Holds the nonce of the peer
 * @param {Buffer} psk The private shared key to use in decryption
 * @returns {PullStream} a through stream
 */
declare function createUnboxStream(remote: any, psk: Buffer): PullStream;

/**
 * Decode the version 1 psk from the given Buffer
 *
 * @param {Buffer} pskBuffer
 * @throws {INVALID_PSK}
 * @returns {Object} The PSK metadata (tag, codecName, psk)
 */
declare function decodeV1PSK(pskBuffer: Buffer): any;

/**
 * Returns a through pull-stream that ensures the passed chunks
 * are buffers instead of strings
 * @returns {PullStream} a through stream
 */
declare function ensureBuffer(): PullStream;

/**
 * @param {Buffer} keyBuffer The private shared key buffer
 * @constructor
 */
declare class Protector {
    constructor(keyBuffer: Buffer);
    /**
     * Takes a given Connection and creates a privaste encryption stream
     * between its two peers from the PSK the Protector instance was
     * created with.
     *
     * @param {Connection} connection The connection to protect
     * @param {function(Error)} callback
     * @returns {Connection} The protected connection
     */
    protect(connection: Connection, callback: (...params: any[]) => any): Connection;
}

/**
 * Generates a PSK that can be used in a libp2p-pnet private network
 * @param {Writer} writer An object containing a `write` method
 * @returns {void}
 */
declare function generate(writer: Writer): void;

/**
 * @param {Buffer} psk The key buffer used for encryption
 * @constructor
 */
declare class State {
    constructor(psk: Buffer);
    /**
     * Creates encryption streams for the given state
     *
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    encrypt(callback: (...params: any[]) => any): void;
}

/**
 * Subscribe the given handler to a pubsub topic
 *
 * @method
 * @param {string} topic
 * @param {function} handler The handler to subscribe
 * @param {object|null} [options]
 * @param {function} [callback] An optional callback
 *
 * @returns {Promise|void} A promise is returned if no callback is provided
 *
 * @example <caption>Subscribe a handler to a topic</caption>
 *
 * // `null` must be passed for options until subscribe is no longer using promisify
 * const handler = (message) => { }
 * await libp2p.subscribe(topic, handler, null)
 *
 * @example <caption>Use a callback instead of the Promise api</caption>
 *
 * // `options` may be passed or omitted when supplying a callback
 * const handler = (message) => { }
 * libp2p.subscribe(topic, handler, callback)
 */
declare function subscribe(topic: string, handler: (...params: any[]) => any, options?: any | null, callback?: (...params: any[]) => any): Promise | void;

/**
 * Unsubscribes from a pubsub topic
 *
 * @method
 * @param {string} topic
 * @param {function|null} handler The handler to unsubscribe from
 * @param {function} [callback] An optional callback
 *
 * @returns {Promise|void} A promise is returned if no callback is provided
 *
 * @example <caption>Unsubscribe a topic for all handlers</caption>
 *
 * // `null` must be passed until unsubscribe is no longer using promisify
 * await libp2p.unsubscribe(topic, null)
 *
 * @example <caption>Unsubscribe a topic for 1 handler</caption>
 *
 * await libp2p.unsubscribe(topic, handler)
 *
 * @example <caption>Use a callback instead of the Promise api</caption>
 *
 * libp2p.unsubscribe(topic, handler, callback)
 */
declare function unsubscribe(topic: string, handler: ((...params: any[]) => any) | null, callback?: (...params: any[]) => any): Promise | void;

/** @class BaseConnection
 */
declare class BaseConnection {
    /**
     * Puts the state into its disconnecting flow
     *
     * @param {Error} err Will be emitted if provided
     * @returns {void}
     */
    close(err: Error): void;
    /**
     * Gets the current state of the connection
     *
     * @returns {string} The current state of the connection
     */
    getState(): string;
    /**
     * Puts the state into encrypting mode
     *
     * @returns {void}
     */
    encrypt(): void;
    /**
     * Puts the state into privatizing mode
     *
     * @returns {void}
     */
    protect(): void;
    /**
     * Puts the state into muxing mode
     *
     * @returns {void}
     */
    upgrade(): void;
    /**
     * Event handler for disconnected.
     *
     * @fires BaseConnection#close
     * @returns {void}
     */
    _onDisconnected(): void;
    /**
     * Event handler for privatized
     *
     * @fires BaseConnection#private
     * @returns {void}
     */
    _onPrivatized(): void;
}

/**
 * @typedef {Object} ConnectionOptions
 * @property {Switch} _switch Our switch instance
 * @property {PeerInfo} peerInfo The PeerInfo of the peer to dial
 * @property {Muxer} muxer Optional - A muxed connection
 * @property {Connection} conn Optional - The base connection
 * @property {string} type Optional - identify the connection as incoming or outgoing. Defaults to out.
 */
declare type ConnectionOptions = {
    _switch: Switch;
    peerInfo: PeerInfo;
    muxer: Muxer;
    conn: Connection;
    type: string;
};

/**
 * @param {ConnectionOptions} connectionOptions
 * @constructor
 */
declare class ConnectionFSM {
    constructor(connectionOptions: ConnectionOptions);
    /**
     * Puts the state into dialing mode
     *
     * @fires ConnectionFSM#Error May emit a DIAL_SELF error
     * @returns {void}
     */
    dial(): void;
    /**
     * Initiates a handshake for the given protocol
     *
     * @param {string} protocol The protocol to negotiate
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    shake(protocol: string, callback: (...params: any[]) => any): void;
    /**
     * Puts the state into muxing mode
     *
     * @returns {void}
     */
    upgrade(): void;
    /**
     * Once a connection has been successfully dialed, the connection
     * will be privatized or encrypted depending on the presence of the
     * Switch.protector.
     *
     * @returns {void}
     */
    _onDialed(): void;
    /**
     * Event handler for disconnecting. Handles any needed cleanup
     *
     * @returns {void}
     */
    _onDisconnecting(): void;
    /**
     * Analyses the given error, if it exists, to determine where the state machine
     * needs to go.
     *
     * @param {Error} err
     * @returns {void}
     */
    _didUpgrade(err: Error): void;
    /**
     * Event handler for state transition errors
     *
     * @param {Error} err
     * @returns {void}
     */
    _onStateError(err: Error): void;
}

declare class ConnectionManager {
    /**
     * Adds a listener for the given `muxer` and creates a handler for it
     * leveraging the Switch.protocolMuxer handler factory
     *
     * @param {Muxer} muxer
     * @returns {void}
     */
    addStreamMuxer(muxer: Muxer): void;
    /**
     * Adds the `encrypt` handler for the given `tag` and also sets the
     * Switch's crypto to passed `encrypt` function
     *
     * @param {String} tag
     * @param {function(PeerID, Connection, PeerId, Callback)} encrypt
     * @returns {void}
     */
    crypto(tag: string, encrypt: (...params: any[]) => any): void;
    /**
     * If config.enabled is true, a Circuit relay will be added to the
     * available Switch transports.
     *
     * @param {any} config
     * @returns {void}
     */
    enableCircuitRelay(config: any): void;
    /**
     * Sets identify to true on the Switch and performs handshakes
     * for libp2p-identify leveraging the Switch's muxer.
     *
     * @returns {void}
     */
    reuse(): void;
}

/**
 * @module dialer/index
 */
declare module "dialer/index" {
    /**
     * @param {DialRequest} dialRequest
     * @returns {void}
     */
    function _dial(dialRequest: DialRequest): void;
    /**
     * Starts the `DialQueueManager`
     *
     * @param {function} callback
     */
    function start(callback: (...params: any[]) => any): void;
    /**
     * Aborts all dials that are queued. This should
     * only be used when the Switch is being stopped
     *
     * @param {function} callback
     */
    function stop(callback: (...params: any[]) => any): void;
    /**
     * Clears the denylist for a given peer
     * @param {PeerInfo} peerInfo
     */
    function clearDenylist(peerInfo: PeerInfo): void;
    /**
     * Attempts to establish a connection to the given `peerInfo` at
     * a lower priority than a standard dial.
     * @param {PeerInfo} peerInfo
     * @param {object} options
     * @param {boolean} options.useFSM Whether or not to return a `ConnectionFSM`. Defaults to false.
     * @param {number} options.priority Lowest priority goes first. Defaults to 20.
     * @param {function(Error, Connection)} callback
     */
    function connect(peerInfo: PeerInfo, options: {
        useFSM: boolean;
        priority: number;
    }, callback: (...params: any[]) => any): void;
    /**
     * Adds the dial request to the queue for the given `peerInfo`
     * The request will be added with a high priority (10).
     * @param {PeerInfo} peerInfo
     * @param {string} protocol
     * @param {function(Error, Connection)} callback
     */
    function dial(peerInfo: PeerInfo, protocol: string, callback: (...params: any[]) => any): void;
    /**
     * Behaves like dial, except it calls back with a ConnectionFSM
     *
     * @param {PeerInfo} peerInfo
     * @param {string} protocol
     * @param {function(Error, ConnectionFSM)} callback
     */
    function dialFSM(peerInfo: PeerInfo, protocol: string, callback: (...params: any[]) => any): void;
}

/**
 * Components required to execute a dial
 * @typedef {Object} DialRequest
 * @property {PeerInfo} peerInfo - The peer to dial to
 * @property {string} [protocol] - The protocol to create a stream for
 * @property {object} options
 * @property {boolean} options.useFSM - If `callback` should return a ConnectionFSM
 * @property {number} options.priority - The priority of the dial
 * @property {function} callback function(Error, Connection|ConnectionFSM)
 */
declare type DialRequest = {
    peerInfo: PeerInfo;
    protocol?: string;
    options: {
        useFSM: boolean;
        priority: number;
    };
    callback: (...params: any[]) => any;
};

/**
 * @typedef {Object} NewConnection
 * @property {ConnectionFSM} connectionFSM
 * @property {boolean} didCreate
 */
declare type NewConnection = {
    connectionFSM: ConnectionFSM;
    didCreate: boolean;
};

/**
 * Attempts to create a new connection or stream (when muxed),
 * via negotiation of the given `protocol`. If no `protocol` is
 * provided, no action will be taken and `callback` will be called
 * immediately with no error or values.
 *
 * @param {object} options
 * @param {string} options.protocol
 * @param {ConnectionFSM} options.connection
 * @param {function(Error, Connection)} options.callback
 * @returns {void}
 */
declare function createConnectionWithProtocol(options: {
    protocol: string;
    connection: ConnectionFSM;
    callback: (...params: any[]) => any;
}): void;

/**
 * @constructor
 * @param {string} peerId
 * @param {Switch} _switch
 * @param {function(string)} onStopped Called when the queue stops
 */
declare class Queue {
    constructor(peerId: string, _switch: Switch, onStopped: (...params: any[]) => any);
    /**
     * Adds the dial request to the queue. The queue is not automatically started
     * @param {string} protocol
     * @param {boolean} useFSM If callback should use a ConnectionFSM instead
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    add(protocol: string, useFSM: boolean, callback: (...params: any[]) => any): void;
    /**
     * Determines whether or not dialing is currently allowed
     * @returns {boolean}
     */
    isDialAllowed(): boolean;
    /**
     * Starts the queue. If the queue was started `true` will be returned.
     * If the queue was already running `false` is returned.
     * @returns {boolean}
     */
    start(): boolean;
    /**
     * Stops the queue
     */
    stop(): void;
    /**
     * Stops the queue and errors the callback for each dial request
     */
    abort(): void;
    /**
     * Marks the queue as denylisted. The queue will be immediately aborted.
     * @returns {void}
     */
    denylist(): void;
}

/**
 * @constructor
 * @param {Switch} _switch
 */
declare class DialQueueManager {
    constructor(_switch: Switch);
    /**
     * Allows the `DialQueueManager` to execute dials
     */
    start(): void;
    /**
     * Iterates over all items in the DialerQueue
     * and executes there callback with an error.
     *
     * This causes the entire DialerQueue to be drained
     */
    stop(): void;
    /**
     * Adds the `dialRequest` to the queue and ensures queue is running
     *
     * @param {DialRequest} dialRequest
     * @returns {void}
     */
    add(dialRequest: DialRequest): void;
    /**
     * Will execute up to `MAX_PARALLEL_DIALS` dials
     */
    run(): void;
    /**
     * Will remove the `peerInfo` from the dial denylist
     * @param {PeerInfo} peerInfo
     */
    clearDenylist(peerInfo: PeerInfo): void;
    /**
     * Returns the `Queue` for the given `peerInfo`
     * @param {PeerInfo} peerInfo
     * @returns {Queue}
     */
    getQueue(peerInfo: PeerInfo): Queue;
}

declare class Switch {
    /**
     * Returns a list of the transports peerInfo has addresses for
     *
     * @param {PeerInfo} peerInfo
     * @returns {Array<Transport>}
     */
    availableTransports(peerInfo: PeerInfo): Transport[];
    /**
     * Adds the `handlerFunc` and `matchFunc` to the Switch's protocol
     * handler list for the given `protocol`. If the `matchFunc` returns
     * true for a protocol check, the `handlerFunc` will be called.
     *
     * @param {string} protocol
     * @param {function(string, Connection)} handlerFunc
     * @param {function(string, string, function(Error, boolean))} matchFunc
     * @returns {void}
     */
    handle(protocol: string, handlerFunc: (...params: any[]) => any, matchFunc: (...params: any[]) => any): void;
    /**
     * Removes the given protocol from the Switch's protocol list
     *
     * @param {string} protocol
     * @returns {void}
     */
    unhandle(protocol: string): void;
    /**
     * If a muxed Connection exists for the given peer, it will be closed
     * and its reference on the Switch will be removed.
     *
     * @param {PeerInfo|Multiaddr|PeerId} peer
     * @param {function()} callback
     * @returns {void}
     */
    hangUp(peer: PeerInfo | Multiaddr | PeerId, callback: (...params: any[]) => any): void;
    /**
     * Returns whether or not the switch has any transports
     *
     * @returns {boolean}
     */
    hasTransports(): boolean;
    /**
     * Issues a start on the Switch state.
     *
     * @param {function} callback deprecated: Listening for the `error` and `start` events are recommended
     * @returns {void}
     */
    start(callback: (...params: any[]) => any): void;
    /**
     * Issues a stop on the Switch state.
     *
     * @param {function} callback deprecated: Listening for the `error` and `stop` events are recommended
     * @returns {void}
     */
    stop(callback: (...params: any[]) => any): void;
}

/**
 * Create a new dialer.
 *
 * @param {number} perPeerLimit
 * @param {number} dialTimeout
 */
declare class LimitDialer {
    constructor(perPeerLimit: number, dialTimeout: number);
    /**
     * Dial a list of multiaddrs on the given transport.
     *
     * @param {PeerId} peer
     * @param {SwarmTransport} transport
     * @param {Array<Multiaddr>} addrs
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    dialMany(peer: PeerId, transport: SwarmTransport, addrs: Multiaddr[], callback: (...params: any[]) => any): void;
    /**
     * Dial a single multiaddr on the given transport.
     *
     * @param {PeerId} peer
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {CancelToken} token
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    dialSingle(peer: PeerId, transport: SwarmTransport, addr: Multiaddr, token: CancelToken, callback: (...params: any[]) => any): void;
}

/**
 * Create a new dial queue.
 *
 * @param {number} limit
 * @param {number} dialTimeout
 */
declare class DialQueue {
    constructor(limit: number, dialTimeout: number);
    /**
     * Add new work to the queue.
     *
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {CancelToken} token
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    push(transport: SwarmTransport, addr: Multiaddr, token: CancelToken, callback: (...params: any[]) => any): void;
}

/**
 * Takes a Switch and returns an Observer that can be used in conjunction with
 * observe-connection.js. The returned Observer comes with `incoming` and
 * `outgoing` properties that can be used in pull streams to emit all metadata
 * for messages that pass through a Connection.
 *
 * @param {Switch} swtch
 * @returns {EventEmitter}
 */
declare function observer(swtch: Switch): EventEmitter;

/**
 * Binds to message events on the given `observer` to generate stats
 * based on the Peer, Protocol and Transport used for the message. Stat
 * events will be emitted via the `update` event.
 *
 * @param {Observer} observer
 * @param {any} _options
 * @returns {Stats}
 */
declare function stats(observer: Observer, _options: any): Stats;

/**
 * Creates and returns a Least Recently Used Cache
 *
 * @param {Number} maxSize
 * @returns {LRUCache}
 */
declare function oldPeers(maxSize: number): LRUCache;

declare class Stats {
    constructor(initialCounters: string[], options: any);
    /**
     * Initializes the internal timer if there are items in the queue. This
     * should only need to be called if `Stats.stop` was previously called, as
     * `Stats.push` will also start the processing.
     *
     * @returns {void}
     */
    start(): void;
    /**
     * Stops processing and computing of stats by clearing the internal
     * timer.
     *
     * @returns {void}
     */
    stop(): void;
    /**
     * Returns a clone of the current stats.
     *
     * @method
     * @readonly
     * @returns {Map<string, Stat>}
     */
    snapshot(): Map<string, Stat>;
    /**
     * Returns a clone of the internal movingAverages
     *
     * @method
     * @readonly
     * @returns {Array<MovingAverage>}
     */
    movingAverages(): MovingAverage[];
    /**
     * Pushes the given operation data to the queue, along with the
     * current Timestamp, then resets the update timer.
     *
     * @param {string} counter
     * @param {number} inc
     * @returns {void}
     */
    push(counter: string, inc: number): void;
}

declare class TransportManager {
    /**
     * Adds a `Transport` to the list of transports on the switch, and assigns it to the given key
     *
     * @param {String} key
     * @param {Transport} transport
     * @returns {void}
     */
    add(key: string, transport: Transport): void;
    /**
     * Closes connections for the given transport key
     * and removes it from the switch.
     *
     * @param {String} key
     * @param {function(Error)} callback
     * @returns {void}
     */
    remove(key: string, callback: (...params: any[]) => any): void;
    /**
     * Calls `remove` on each transport the switch has
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    removeAll(callback: (...params: any[]) => any): void;
    /**
     * For a given transport `key`, dial to all that transport multiaddrs
     *
     * @param {String} key Key of the `Transport` to dial
     * @param {PeerInfo} peerInfo
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    dial(key: string, peerInfo: PeerInfo, callback: (...params: any[]) => any): void;
    /**
     * For a given Transport `key`, listen on all multiaddrs in the switch's `_peerInfo`.
     * If a `handler` is not provided, the Switch's `protocolMuxer` will be used.
     *
     * @param {String} key
     * @param {*} _options Currently ignored
     * @param {function(Connection)} handler
     * @param {function(Error)} callback
     * @returns {void}
     */
    listen(key: string, _options: any, handler: (...params: any[]) => any, callback: (...params: any[]) => any): void;
    /**
     * Closes the transport with the given key, by closing all of its listeners
     *
     * @param {String} key
     * @param {function(Error)} callback
     * @returns {void}
     */
    close(key: string, callback: (...params: any[]) => any): void;
    /**
     * For a given transport, return its multiaddrs that match the given multiaddrs
     *
     * @param {Transport} transport
     * @param {Array<Multiaddr>} multiaddrs
     * @param {PeerInfo} peerInfo Optional - a peer whose addresses should not be returned
     * @returns {Array<Multiaddr>}
     */
    static dialables(transport: Transport, multiaddrs: Multiaddr[], peerInfo: PeerInfo): Multiaddr[];
}

/**
 * Expand addresses in peer info into array of addresses with and without peer
 * ID suffix.
 *
 * @param {PeerInfo} peerInfo Our peer info object
 * @returns {String[]}
 */
declare function ourAddresses(peerInfo: PeerInfo): String[];

/**
 * Get the destination address of a (possibly relay) multiaddr as a string
 *
 * @param {Multiaddr} addr
 * @returns {String}
 */
declare function getDestination(addr: Multiaddr): string;

/**
 * For a given multistream, registers to handle the given connection
 * @param {MultistreamDialer} multistream
 * @param {Connection} connection
 * @returns {Promise}
 */
declare function msHandle(multistream: MultistreamDialer, connection: Connection): Promise;

/**
 * For a given multistream, selects the given protocol
 * @param {MultistreamDialer} multistream
 * @param {string} protocol
 * @returns {Promise} Resolves the selected Connection
 */
declare function msSelect(multistream: MultistreamDialer, protocol: string): Promise;

/**
 * Runs identify for the given connection and verifies it against the
 * PeerInfo provided
 * @param {Connection} connection
 * @param {PeerInfo} cryptoPeerInfo The PeerInfo determined during crypto exchange
 * @returns {Promise} Resolves {peerInfo, observedAddrs}
 */
declare function identifyDialer(connection: Connection, cryptoPeerInfo: PeerInfo): Promise;

/**
 * Get unique values from `arr` using `getValue` to determine
 * what is used for uniqueness
 * @param {Array} arr The array to get unique values for
 * @param {function(value)} getValue The function to determine what is compared
 * @returns {Array}
 */
declare function uniqueBy(arr: Array, getValue: (...params: any[]) => any): Array;


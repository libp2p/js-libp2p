export = TransportManager;
/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>} TransportFactory
 * @typedef {import('libp2p-interfaces/src/transport/types').Transport<any, any>} Transport
 *
 * @typedef {Object} TransportManagerProperties
 * @property {import('./')} libp2p
 * @property {import('./upgrader')} upgrader
 *
 * @typedef {Object} TransportManagerOptions
 * @property {number} [faultTolerance = FAULT_TOLERANCE.FATAL_ALL] - Address listen error tolerance.
 */
declare class TransportManager {
    /**
     * @class
     * @param {TransportManagerProperties & TransportManagerOptions} options
     */
    constructor({ libp2p, upgrader, faultTolerance }: TransportManagerProperties & TransportManagerOptions);
    libp2p: import("./");
    upgrader: import("./upgrader");
    /** @type {Map<string, Transport>} */
    _transports: Map<string, import("libp2p-interfaces/src/transport/types").Transport<any, any>>;
    _listeners: Map<any, any>;
    _listenerOptions: Map<any, any>;
    faultTolerance: number;
    /**
     * Adds a `Transport` to the manager
     *
     * @param {string} key
     * @param {TransportFactory} Transport
     * @param {*} transportOptions - Additional options to pass to the transport
     * @returns {void}
     */
    add(key: string, Transport: import("libp2p-interfaces/src/transport/types").TransportFactory<any, any>, transportOptions?: any): void;
    /**
     * Stops all listeners
     *
     * @async
     */
    close(): Promise<void>;
    /**
     * Dials the given Multiaddr over it's supported transport
     *
     * @param {Multiaddr} ma
     * @param {*} options
     * @returns {Promise<Connection>}
     */
    dial(ma: Multiaddr, options: any): Promise<Connection>;
    /**
     * Returns all Multiaddr's the listeners are using
     *
     * @returns {Multiaddr[]}
     */
    getAddrs(): Multiaddr[];
    /**
     * Returns all the transports instances.
     *
     * @returns {IterableIterator<Transport>}
     */
    getTransports(): IterableIterator<import("libp2p-interfaces/src/transport/types").Transport<any, any>>;
    /**
     * Finds a transport that matches the given Multiaddr
     *
     * @param {Multiaddr} ma
     * @returns {Transport|null}
     */
    transportForMultiaddr(ma: Multiaddr): import("libp2p-interfaces/src/transport/types").Transport<any, any> | null;
    /**
     * Starts listeners for each listen Multiaddr.
     *
     * @async
     * @param {Multiaddr[]} addrs - addresses to attempt to listen on
     */
    listen(addrs: Multiaddr[]): Promise<void>;
    /**
     * Removes the given transport from the manager.
     * If a transport has any running listeners, they will be closed.
     *
     * @async
     * @param {string} key
     */
    remove(key: string): Promise<void>;
    /**
     * Removes all transports from the manager.
     * If any listeners are running, they will be closed.
     *
     * @async
     */
    removeAll(): Promise<void>;
}
declare namespace TransportManager {
    export { FAULT_TOLERANCE as FaultTolerance, Multiaddr, Connection, TransportFactory, Transport, TransportManagerProperties, TransportManagerOptions };
}
type Multiaddr = import('multiaddr').Multiaddr;
type Connection = import("libp2p-interfaces/src/connection/connection");
type TransportManagerProperties = {
    libp2p: import('./');
    upgrader: import('./upgrader');
};
type TransportManagerOptions = {
    /**
     * - Address listen error tolerance.
     */
    faultTolerance?: number | undefined;
};
/**
 * Enum Transport Manager Fault Tolerance values.
 * FATAL_ALL should be used for failing in any listen circumstance.
 * NO_FATAL should be used for not failing when not listening.
 */
type FAULT_TOLERANCE = number;
declare namespace FAULT_TOLERANCE {
    const FATAL_ALL: number;
    const NO_FATAL: number;
}
type TransportFactory = import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>;
type Transport = import('libp2p-interfaces/src/transport/types').Transport<any, any>;
//# sourceMappingURL=transport-manager.d.ts.map
export = Registrar;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('./peer-store/types').PeerStore} PeerStore
 * @typedef {import('./connection-manager')} ConnectionManager
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('./').HandlerProps} HandlerProps
 */
/**
 *
 */
/**
 * Responsible for notifying registered protocols of events in the network.
 */
declare class Registrar {
    /**
     * @param {Object} props
     * @param {PeerStore} props.peerStore
     * @param {ConnectionManager} props.connectionManager
     * @class
     */
    constructor({ peerStore, connectionManager }: {
        peerStore: PeerStore;
        connectionManager: ConnectionManager;
    });
    peerStore: import("./peer-store/types").PeerStore;
    connectionManager: import("./connection-manager");
    /**
     * Map of topologies
     *
     * @type {Map<string, Topology>}
     */
    topologies: Map<string, Topology>;
    /** @type {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void} */
    _handle: (protocols: string[] | string, handler: (props: HandlerProps) => void) => void;
    /**
     * Remove a disconnected peer from the record
     *
     * @param {Connection} connection
     * @returns {void}
     */
    _onDisconnect(connection: Connection): void;
    /**
     * @param {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void} handle
     */
    set handle(arg: (protocols: string[] | string, handler: (props: HandlerProps) => void) => void);
    /**
     * @returns {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void}
     */
    get handle(): (protocols: string[] | string, handler: (props: HandlerProps) => void) => void;
    /**
     * Get a connection with a peer.
     *
     * @param {PeerId} peerId
     * @returns {Connection | null}
     */
    getConnection(peerId: PeerId): Connection | null;
    /**
     * Register handlers for a set of multicodecs given
     *
     * @param {Topology} topology - protocol topology
     * @returns {Promise<string>} registrar identifier
     */
    register(topology: Topology): Promise<string>;
    /**
     * Unregister topology.
     *
     * @param {string} id - registrar identifier
     * @returns {boolean} unregistered successfully
     */
    unregister(id: string): boolean;
}
declare namespace Registrar {
    export { PeerId, PeerStore, ConnectionManager, Connection, HandlerProps };
}
import Topology = require("libp2p-interfaces/src/topology");
type Connection = import("libp2p-interfaces/src/connection/connection");
type PeerId = import('peer-id');
type PeerStore = import('./peer-store/types').PeerStore;
type ConnectionManager = import('./connection-manager');
type HandlerProps = import('./').HandlerProps;
//# sourceMappingURL=registrar.d.ts.map
export = Registrar;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('./peer-store')} PeerStore
 * @typedef {import('./connection-manager')} ConnectionManager
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
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
    peerStore: import("./peer-store");
    connectionManager: import("./connection-manager");
    /**
     * Map of topologies
     *
     * @type {Map<string, object>}
     */
    topologies: Map<string, object>;
    _handle: any;
    /**
     * Remove a disconnected peer from the record
     *
     * @param {Connection} connection
     * @param {Error} [error]
     * @returns {void}
     */
    _onDisconnect(connection: Connection, error?: Error | undefined): void;
    set handle(arg: any);
    get handle(): any;
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
     * @returns {string} registrar identifier
     */
    register(topology: Topology): string;
    /**
     * Unregister topology.
     *
     * @param {string} id - registrar identifier
     * @returns {boolean} unregistered successfully
     */
    unregister(id: string): boolean;
}
declare namespace Registrar {
    export { PeerId, PeerStore, ConnectionManager, Connection };
}
type Connection = import("libp2p-interfaces/src/connection/connection");
type PeerId = import("peer-id");
import Topology = require("libp2p-interfaces/src/topology");
type PeerStore = import("./peer-store");
type ConnectionManager = import("./connection-manager");
//# sourceMappingURL=registrar.d.ts.map
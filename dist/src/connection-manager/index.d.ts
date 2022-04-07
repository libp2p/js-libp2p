export = ConnectionManager;
/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */
/**
 * @typedef {Object} ConnectionManagerOptions
 * @property {number} [maxConnections = Infinity] - The maximum number of connections allowed.
 * @property {number} [minConnections = 0] - The minimum number of connections to avoid pruning.
 * @property {number} [maxData = Infinity] - The max data (in and out), per average interval to allow.
 * @property {number} [maxSentData = Infinity] - The max outgoing data, per average interval to allow.
 * @property {number} [maxReceivedData = Infinity] - The max incoming data, per average interval to allow.
 * @property {number} [maxEventLoopDelay = Infinity] - The upper limit the event loop can take to run.
 * @property {number} [pollInterval = 2000] - How often, in milliseconds, metrics and latency should be checked.
 * @property {number} [movingAverageInterval = 60000] - How often, in milliseconds, to compute averages.
 * @property {number} [defaultPeerValue = 1] - The value of the peer.
 * @property {boolean} [autoDial = true] - Should preemptively guarantee connections are above the low watermark.
 * @property {number} [autoDialInterval = 10000] - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark.
 */
/**
 *
 * @fires ConnectionManager#peer:connect Emitted when a new peer is connected.
 * @fires ConnectionManager#peer:disconnect Emitted when a peer is disconnected.
 */
declare class ConnectionManager extends EventEmitter {
    /**
     * Responsible for managing known connections.
     *
     * @class
     * @param {Libp2p} libp2p
     * @param {ConnectionManagerOptions} options
     */
    constructor(libp2p: Libp2p, options?: ConnectionManagerOptions);
    _libp2p: import("../");
    _peerId: string;
    _options: any;
    /**
     * Map of peer identifiers to their peer value for pruning connections.
     *
     * @type {Map<string, number>}
     */
    _peerValues: Map<string, number>;
    /**
     * Map of connections per peer
     *
     * @type {Map<string, Connection[]>}
     */
    connections: Map<string, Connection[]>;
    _started: boolean;
    _timer: any;
    /**
     * Checks the libp2p metrics to determine if any values have exceeded
     * the configured maximums.
     *
     * @private
     */
    private _checkMetrics;
    _latencyMonitor: LatencyMonitor;
    /**
     * Get current number of open connections.
     */
    get size(): number;
    /**
     * Starts the Connection Manager. If Metrics are not enabled on libp2p
     * only event loop and connection limits will be monitored.
     */
    start(): void;
    /**
     * If the event loop is slow, maybe close a connection
     *
     * @private
     * @param {*} summary - The LatencyMonitor summary
     */
    private _onLatencyMeasure;
    /**
     * Stops the Connection Manager
     *
     * @async
     */
    stop(): Promise<void>;
    /**
     * Cleans up the connections
     *
     * @async
     */
    _close(): Promise<void>;
    /**
     * Sets the value of the given peer. Peers with lower values
     * will be disconnected first.
     *
     * @param {PeerId} peerId
     * @param {number} value - A number between 0 and 1
     * @returns {void}
     */
    setPeerValue(peerId: PeerId, value: number): void;
    /**
     * Tracks the incoming connection and check the connection limit
     *
     * @param {Connection} connection
     */
    onConnect(connection: Connection): Promise<void>;
    /**
     * Removes the connection from tracking
     *
     * @param {Connection} connection
     * @returns {void}
     */
    onDisconnect(connection: Connection): void;
    /**
     * Get a connection with a peer.
     *
     * @param {PeerId} peerId
     * @returns {Connection|null}
     */
    get(peerId: PeerId): Connection | null;
    /**
     * Get all open connections with a peer.
     *
     * @param {PeerId} peerId
     * @returns {Connection[]}
     */
    getAll(peerId: PeerId): Connection[];
    /**
     * If the `value` of `name` has exceeded its limit, maybe close a connection
     *
     * @private
     * @param {string} name - The name of the field to check limits for
     * @param {number} value - The current value of the field
     */
    private _checkMaxLimit;
    /**
     * If we have more connections than our maximum, close a connection
     * to the lowest valued peer.
     *
     * @private
     */
    private _maybeDisconnectOne;
}
declare namespace ConnectionManager {
    export { Libp2p, Connection, ConnectionManagerOptions };
}
import { EventEmitter } from "events";
type Connection = import("libp2p-interfaces/src/connection/connection");
import LatencyMonitor = require("./latency-monitor");
import PeerId = require("peer-id");
type Libp2p = import('../');
type ConnectionManagerOptions = {
    /**
     * - The maximum number of connections allowed.
     */
    maxConnections?: number | undefined;
    /**
     * - The minimum number of connections to avoid pruning.
     */
    minConnections?: number | undefined;
    /**
     * - The max data (in and out), per average interval to allow.
     */
    maxData?: number | undefined;
    /**
     * - The max outgoing data, per average interval to allow.
     */
    maxSentData?: number | undefined;
    /**
     * - The max incoming data, per average interval to allow.
     */
    maxReceivedData?: number | undefined;
    /**
     * - The upper limit the event loop can take to run.
     */
    maxEventLoopDelay?: number | undefined;
    /**
     * - How often, in milliseconds, metrics and latency should be checked.
     */
    pollInterval?: number | undefined;
    /**
     * - How often, in milliseconds, to compute averages.
     */
    movingAverageInterval?: number | undefined;
    /**
     * - The value of the peer.
     */
    defaultPeerValue?: number | undefined;
    /**
     * - Should preemptively guarantee connections are above the low watermark.
     */
    autoDial?: boolean | undefined;
    /**
     * - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark.
     */
    autoDialInterval?: number | undefined;
};
//# sourceMappingURL=index.d.ts.map
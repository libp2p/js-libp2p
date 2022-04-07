export = Metrics;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} MultiaddrConnection
 */
/**
 * @typedef MetricsOptions
 * @property {number} [computeThrottleMaxQueueSize = defaultOptions.computeThrottleMaxQueueSize]
 * @property {number} [computeThrottleTimeout = defaultOptions.computeThrottleTimeout]
 * @property {number[]} [movingAverageIntervals = defaultOptions.movingAverageIntervals]
 * @property {number} [maxOldPeersRetention = defaultOptions.maxOldPeersRetention]
 */
declare class Metrics {
    /**
     * Merges `other` into `target`. `target` will be modified
     * and returned.
     *
     * @param {Stats} target
     * @param {Stats} other
     * @returns {Stats}
     */
    static mergeStats(target: Stats, other: Stats): Stats;
    /**
     * @class
     * @param {MetricsOptions} options
     */
    constructor(options: MetricsOptions);
    _options: any;
    _globalStats: Stats;
    _peerStats: Map<any, any>;
    _protocolStats: Map<any, any>;
    _oldPeers: any;
    _running: boolean;
    /**
     * Takes the metadata for a message and tracks it in the
     * appropriate categories. If the protocol is present, protocol
     * stats will also be tracked.
     *
     * @private
     * @param {object} params
     * @param {PeerId} params.remotePeer - Remote peer
     * @param {string} [params.protocol] - Protocol string the stream is running
     * @param {string} params.direction - One of ['in','out']
     * @param {number} params.dataLength - Size of the message
     * @returns {void}
     */
    private _onMessage;
    _systems: Map<any, any>;
    /**
     * Must be called for stats to saved. Any data pushed for tracking
     * will be ignored.
     */
    start(): void;
    /**
     * Stops all averages timers and prevents new data from being tracked.
     * Once `stop` is called, `start` must be called to resume stats tracking.
     */
    stop(): void;
    /**
     * Gets the global `Stats` object
     *
     * @returns {Stats}
     */
    get global(): Stats;
    /**
     * Returns a list of `PeerId` strings currently being tracked
     *
     * @returns {string[]}
     */
    get peers(): string[];
    /**
     * @returns {Map<string, Map<string, Map<string, any>>>}
     */
    getComponentMetrics(): Map<string, Map<string, Map<string, any>>>;
    updateComponentMetric({ system, component, metric, value }: {
        system?: string | undefined;
        component: any;
        metric: any;
        value: any;
    }): void;
    /**
     * Returns the `Stats` object for the given `PeerId` whether it
     * is a live peer, or in the disconnected peer LRU cache.
     *
     * @param {PeerId} peerId
     * @returns {Stats}
     */
    forPeer(peerId: PeerId): Stats;
    /**
     * Returns a list of all protocol strings currently being tracked.
     *
     * @returns {string[]}
     */
    get protocols(): string[];
    /**
     * Returns the `Stats` object for the given `protocol`.
     *
     * @param {string} protocol
     * @returns {Stats}
     */
    forProtocol(protocol: string): Stats;
    /**
     * Should be called when all connections to a given peer
     * have closed. The `Stats` collection for the peer will
     * be stopped and moved to an LRU for temporary retention.
     *
     * @param {PeerId} peerId
     */
    onPeerDisconnected(peerId: PeerId): void;
    /**
     * Replaces the `PeerId` string with the given `peerId`.
     * If stats are already being tracked for the given `peerId`, the
     * placeholder stats will be merged with the existing stats.
     *
     * @param {PeerId} placeholder - A peerId string
     * @param {PeerId} peerId
     * @returns {void}
     */
    updatePlaceholder(placeholder: PeerId, peerId: PeerId): void;
    /**
     * Tracks data running through a given Duplex Iterable `stream`. If
     * the `peerId` is not provided, a placeholder string will be created and
     * returned. This allows lazy tracking of a peer when the peer is not yet known.
     * When the `PeerId` is known, `Metrics.updatePlaceholder` should be called
     * with the placeholder string returned from here, and the known `PeerId`.
     *
     * @param {Object} options
     * @param {MultiaddrConnection} options.stream - A duplex iterable stream
     * @param {PeerId} [options.remotePeer] - The id of the remote peer that's connected
     * @param {string} [options.protocol] - The protocol the stream is running
     * @returns {MultiaddrConnection} The peerId string or placeholder string
     */
    trackStream({ stream, remotePeer, protocol }: {
        stream: MultiaddrConnection;
        remotePeer?: import("peer-id") | undefined;
        protocol?: string | undefined;
    }): MultiaddrConnection;
}
declare namespace Metrics {
    export { PeerId, MultiaddrConnection, MetricsOptions };
}
import Stats = require("./stats");
type PeerId = import('peer-id');
type MultiaddrConnection = import('libp2p-interfaces/src/transport/types').MultiaddrConnection;
type MetricsOptions = {
    computeThrottleMaxQueueSize?: number | undefined;
    computeThrottleTimeout?: number | undefined;
    movingAverageIntervals?: number[] | undefined;
    maxOldPeersRetention?: number | undefined;
};
//# sourceMappingURL=index.d.ts.map
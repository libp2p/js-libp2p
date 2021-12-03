export = LatencyMonitor;
/**
 * @typedef {Object} SummaryObject
 * @property {number} events How many events were called
 * @property {number} minMS What was the min time for a cb to be called
 * @property {number} maxMS What was the max time for a cb to be called
 * @property {number} avgMs What was the average time for a cb to be called
 * @property {number} lengthMs How long this interval was in ms
 *
 * @typedef {Object} LatencyMonitorOptions
 * @property {number} [latencyCheckIntervalMs=500] - How often to add a latency check event (ms)
 * @property {number} [dataEmitIntervalMs=5000] - How often to summarize latency check events. null or 0 disables event firing
 * @property {Function} [asyncTestFn] - What cb-style async function to use
 * @property {number} [latencyRandomPercentage=5] - What percent (+/-) of latencyCheckIntervalMs should we randomly use? This helps avoid alignment to other events.
 */
/**
 * A class to monitor latency of any async function which works in a browser or node. This works by periodically calling
 * the asyncTestFn and timing how long it takes the callback to be called. It can also periodically emit stats about this.
 * This can be disabled and stats can be pulled via setting dataEmitIntervalMs = 0.
 *
 * @extends {EventEmitter}
 *
 * The default implementation is an event loop latency monitor. This works by firing periodic events into the event loop
 * and timing how long it takes to get back.
 *
 * @example
 * const monitor = new LatencyMonitor();
 * monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
 *
 * @example
 * const monitor = new LatencyMonitor({latencyCheckIntervalMs: 1000, dataEmitIntervalMs: 60000, asyncTestFn:ping});
 * monitor.on('data', (summary) => console.log('Ping Pong Latency: %O', summary));
 */
declare class LatencyMonitor extends EventEmitter {
    /**
     * @class
     * @param {LatencyMonitorOptions} [options]
     */
    constructor({ latencyCheckIntervalMs, dataEmitIntervalMs, asyncTestFn, latencyRandomPercentage }?: LatencyMonitorOptions | undefined);
    latencyCheckIntervalMs: number;
    latencyRandomPercentage: number;
    _latecyCheckMultiply: number;
    _latecyCheckSubtract: number;
    dataEmitIntervalMs: number | undefined;
    asyncTestFn: Function | undefined;
    start(): void;
    now: (() => number) | NodeJS.HRTime | undefined;
    getDeltaMS: ((startTime: any) => number) | undefined;
    _latencyData: {
        startTime: number | [number, number];
        minMs: number;
        maxMs: number;
        events: number;
        totalMs: number;
    } | undefined;
    _visibilityChangeEmitter: VisibilityChangeEmitter | undefined;
    stop(): void;
    /**
     * Start internal timers
     *
     * @private
     */
    private _startTimers;
    _emitIntervalID: NodeJS.Timer | undefined;
    /**
     * Stop internal timers
     *
     * @private
     */
    private _stopTimers;
    _checkLatencyID: NodeJS.Timeout | undefined;
    /**
     * Emit summary only if there were events. It might not have any events if it was forced via a page hidden/show
     *
     * @private
     */
    private _emitSummary;
    /**
     * Calling this function will end the collection period. If a timing event was already fired and somewhere in the queue,
     * it will not count for this time period
     *
     * @returns {SummaryObject}
     */
    getSummary(): SummaryObject;
    /**
     * Randomly calls an async fn every roughly latencyCheckIntervalMs (plus some randomness). If no async fn is found,
     * it will simply report on event loop latency.
     *
     * @private
     */
    private _checkLatency;
    _initLatencyData(): {
        startTime: number | [number, number];
        minMs: number;
        maxMs: number;
        events: number;
        totalMs: number;
    };
}
declare namespace LatencyMonitor {
    export { SummaryObject, LatencyMonitorOptions };
}
import { EventEmitter } from "events";
import VisibilityChangeEmitter = require("./visibility-change-emitter");
type SummaryObject = {
    /**
     * How many events were called
     */
    events: number;
    /**
     * What was the min time for a cb to be called
     */
    minMS: number;
    /**
     * What was the max time for a cb to be called
     */
    maxMS: number;
    /**
     * What was the average time for a cb to be called
     */
    avgMs: number;
    /**
     * How long this interval was in ms
     */
    lengthMs: number;
};
type LatencyMonitorOptions = {
    /**
     * - How often to add a latency check event (ms)
     */
    latencyCheckIntervalMs?: number | undefined;
    /**
     * - How often to summarize latency check events. null or 0 disables event firing
     */
    dataEmitIntervalMs?: number | undefined;
    /**
     * - What cb-style async function to use
     */
    asyncTestFn?: Function | undefined;
    /**
     * - What percent (+/-) of latencyCheckIntervalMs should we randomly use? This helps avoid alignment to other events.
     */
    latencyRandomPercentage?: number | undefined;
};
//# sourceMappingURL=latency-monitor.d.ts.map
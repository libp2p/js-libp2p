export = Stats;
/**
 * @typedef {import('@vascosantos/moving-average').IMovingAverage} IMovingAverage
 * @typedef {import('bignumber.js').BigNumber} Big
 */
declare class Stats extends EventEmitter {
    /**
     * A queue based manager for stat processing
     *
     * @class
     * @param {string[]} initialCounters
     * @param {any} options
     */
    constructor(initialCounters: string[], options: any);
    _options: any;
    _queue: any[];
    /** @type {{ dataReceived: Big, dataSent: Big }} */
    _stats: {
        dataReceived: Big;
        dataSent: Big;
    };
    _frequencyLastTime: number;
    _frequencyAccumulators: {};
    /** @type {{ dataReceived: IMovingAverage[], dataSent: IMovingAverage[] }} */
    _movingAverages: {
        dataReceived: IMovingAverage[];
        dataSent: IMovingAverage[];
    };
    /**
     * If there are items in the queue, they will will be processed and
     * the frequency for all items will be updated based on the Timestamp
     * of the last item in the queue. The `update` event will also be emitted
     * with the latest stats.
     *
     * If there are no items in the queue, no action is taken.
     *
     * @private
     * @returns {void}
     */
    private _update;
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
    _timeout: any;
    /**
     * Returns a clone of the current stats.
     */
    get snapshot(): {
        dataReceived: Big;
        dataSent: Big;
    };
    /**
     * Returns a clone of the internal movingAverages
     */
    get movingAverages(): {
        dataReceived: IMovingAverage[];
        dataSent: IMovingAverage[];
    };
    /**
     * Returns a plain JSON object of the stats
     *
     * @returns {*}
     */
    toJSON(): any;
    /**
     * Pushes the given operation data to the queue, along with the
     * current Timestamp, then resets the update timer.
     *
     * @param {string} counter
     * @param {number} inc
     * @returns {void}
     */
    push(counter: string, inc: number): void;
    /**
     * Resets the timeout for triggering updates.
     *
     * @private
     * @returns {void}
     */
    private _resetComputeTimeout;
    /**
     * Calculates and returns the timeout for the next update based on
     * the urgency of the update.
     *
     * @private
     * @returns {number}
     */
    private _nextTimeout;
    /**
     * For each key in the stats, the frequency and moving averages
     * will be updated via Stats._updateFrequencyFor based on the time
     * difference between calls to this method.
     *
     * @private
     * @param {Timestamp} latestTime
     * @returns {void}
     */
    private _updateFrequency;
    /**
     * Updates the `movingAverages` for the given `key` and also
     * resets the `frequencyAccumulator` for the `key`.
     *
     * @private
     * @param {string} key
     * @param {number} timeDiffMS - Time in milliseconds
     * @param {Timestamp} latestTime - Time in ticks
     * @returns {void}
     */
    private _updateFrequencyFor;
    /**
     * For the given operation, `op`, the stats and `frequencyAccumulator`
     * will be updated or initialized if they don't already exist.
     *
     * @private
     * @param {{string, number}[]} op
     * @throws {InvalidNumber}
     * @returns {void}
     */
    private _applyOp;
}
declare namespace Stats {
    export { IMovingAverage, Big };
}
import { EventEmitter } from "events";
type IMovingAverage = import('@vascosantos/moving-average').IMovingAverage;
type Big = import('bignumber.js').BigNumber;
//# sourceMappingURL=stats.d.ts.map
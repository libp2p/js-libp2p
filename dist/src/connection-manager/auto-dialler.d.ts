export = AutoDialler;
/**
 * @typedef {import('../index')} Libp2p
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */
/**
 * @typedef {Object} AutoDiallerOptions
 * @property {boolean} [enabled = true] - Should preemptively guarantee connections are above the low watermark
 * @property {number} [minConnections = 0] - The minimum number of connections to avoid pruning
 * @property {number} [autoDialInterval = 10000] - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark
 */
declare class AutoDialler {
    /**
     * Proactively tries to connect to known peers stored in the PeerStore.
     * It will keep the number of connections below the upper limit and sort
     * the peers to connect based on wether we know their keys and protocols.
     *
     * @class
     * @param {Libp2p} libp2p
     * @param {AutoDiallerOptions} options
     */
    constructor(libp2p: Libp2p, options?: AutoDiallerOptions);
    _options: any;
    _libp2p: import("../index");
    _running: boolean;
    _autoDialTimeout: any;
    _autoDial(): Promise<void>;
    /**
     * Starts the auto dialer
     */
    start(): Promise<void>;
    /**
     * Stops the auto dialler
     */
    stop(): Promise<void>;
}
declare namespace AutoDialler {
    export { Libp2p, Connection, AutoDiallerOptions };
}
type Libp2p = import('../index');
type AutoDiallerOptions = {
    /**
     * - Should preemptively guarantee connections are above the low watermark
     */
    enabled?: boolean | undefined;
    /**
     * - The minimum number of connections to avoid pruning
     */
    minConnections?: number | undefined;
    /**
     * - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark
     */
    autoDialInterval?: number | undefined;
};
type Connection = import("libp2p-interfaces/src/connection/connection");
//# sourceMappingURL=auto-dialler.d.ts.map
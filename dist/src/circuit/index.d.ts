export = Relay;
/**
 * @typedef {import('../')} Libp2p
 *
 * @typedef {Object} RelayAdvertiseOptions
 * @property {number} [bootDelay = ADVERTISE_BOOT_DELAY]
 * @property {boolean} [enabled = true]
 * @property {number} [ttl = ADVERTISE_TTL]
 *
 * @typedef {Object} HopOptions
 * @property {boolean} [enabled = false]
 * @property {boolean} [active = false]
 *
 * @typedef {Object} AutoRelayOptions
 * @property {number} [maxListeners = 2] - maximum number of relays to listen.
 * @property {boolean} [enabled = false]
 */
declare class Relay {
    /**
     * Creates an instance of Relay.
     *
     * @class
     * @param {Libp2p} libp2p
     */
    constructor(libp2p: Libp2p);
    _libp2p: import("../");
    _options: {
        enabled: boolean;
        advertise: {
            bootDelay: number;
            enabled: boolean;
            ttl: number;
        } & RelayAdvertiseOptions;
        hop: {
            enabled: boolean;
            active: boolean;
        } & HopOptions;
        autoRelay: {
            enabled: boolean;
            maxListeners: number;
        } & AutoRelayOptions;
    };
    _autoRelay: false | AutoRelay;
    /**
     * Advertise hop relay service in the network.
     *
     * @returns {Promise<void>}
     */
    _advertiseService(): Promise<void>;
    /**
     * Start Relay service.
     *
     * @returns {void}
     */
    start(): void;
    _timeout: any;
    /**
     * Stop Relay service.
     *
     * @returns {void}
     */
    stop(): void;
}
declare namespace Relay {
    export { Libp2p, RelayAdvertiseOptions, HopOptions, AutoRelayOptions };
}
import AutoRelay = require("./auto-relay");
type Libp2p = import('../');
type RelayAdvertiseOptions = {
    bootDelay?: number | undefined;
    enabled?: boolean | undefined;
    ttl?: number | undefined;
};
type HopOptions = {
    enabled?: boolean | undefined;
    active?: boolean | undefined;
};
type AutoRelayOptions = {
    /**
     * - maximum number of relays to listen.
     */
    maxListeners?: number | undefined;
    enabled?: boolean | undefined;
};
//# sourceMappingURL=index.d.ts.map
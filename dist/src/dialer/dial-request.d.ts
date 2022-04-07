export = DialRequest;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('./')} Dialer
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */
/**
 * @typedef {Object} DialOptions
 * @property {AbortSignal} signal
 *
 * @typedef {Object} DialRequestOptions
 * @property {Multiaddr[]} addrs
 * @property {(m: Multiaddr, options: DialOptions) => Promise<Connection>} dialAction
 * @property {Dialer} dialer
 */
declare class DialRequest {
    /**
     * Manages running the `dialAction` on multiple provided `addrs` in parallel
     * up to a maximum determined by the number of tokens returned
     * from `dialer.getTokens`. Once a DialRequest is created, it can be
     * started using `DialRequest.run(options)`. Once a single dial has succeeded,
     * all other dials in the request will be cancelled.
     *
     * @class
     * @param {DialRequestOptions} options
     */
    constructor({ addrs, dialAction, dialer }: DialRequestOptions);
    addrs: import("multiaddr").Multiaddr[];
    dialer: import("./");
    dialAction: (m: Multiaddr, options: DialOptions) => Promise<Connection>;
    /**
     * @async
     * @param {object} [options]
     * @param {AbortSignal} [options.signal] - An AbortController signal
     * @returns {Promise<Connection>}
     */
    run(options?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<Connection>;
}
declare namespace DialRequest {
    export { Connection, Dialer, Multiaddr, DialOptions, DialRequestOptions };
}
type Connection = import("libp2p-interfaces/src/connection/connection");
type DialRequestOptions = {
    addrs: Multiaddr[];
    dialAction: (m: Multiaddr, options: DialOptions) => Promise<Connection>;
    dialer: Dialer;
};
type Dialer = import('./');
type Multiaddr = import('multiaddr').Multiaddr;
type DialOptions = {
    signal: AbortSignal;
};
//# sourceMappingURL=dial-request.d.ts.map
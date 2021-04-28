export = Circuit;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
declare class Circuit {
    /**
     * Checks if the given value is a Transport instance.
     *
     * @param {any} other
     * @returns {other is Transport}
     */
    static isTransport(other: any): other is Transport;
    /**
     * Creates an instance of the Circuit Transport.
     *
     * @class
     * @param {object} options
     * @param {import('../')} options.libp2p
     * @param {import('../upgrader')} options.upgrader
     */
    constructor({ libp2p, upgrader }: {
        libp2p: import('../');
        upgrader: import('../upgrader');
    });
    _dialer: import("../dialer");
    _registrar: import("../registrar");
    _connectionManager: import("../connection-manager");
    _upgrader: import("../upgrader");
    _options: {
        enabled: boolean;
        advertise: {
            bootDelay: number;
            enabled: boolean;
            ttl: number;
        };
        hop: {
            enabled: boolean;
            active: boolean;
        };
        autoRelay: {
            enabled: boolean;
            maxListeners: number;
        };
    } & import("../").RelayOptions;
    _libp2p: import("../");
    peerId: PeerId;
    /**
     * @param {Object} props
     * @param {Connection} props.connection
     * @param {MuxedStream} props.stream
     */
    _onProtocol({ connection, stream }: {
        connection: Connection;
        stream: MuxedStream;
    }): Promise<void>;
    /**
     * Dial a peer over a relay
     *
     * @param {Multiaddr} ma - the multiaddr of the peer to dial
     * @param {Object} options - dial options
     * @param {AbortSignal} [options.signal] - An optional abort signal
     * @returns {Promise<Connection>} - the connection
     */
    dial(ma: Multiaddr, options: {
        signal?: AbortSignal | undefined;
    }): Promise<Connection>;
    /**
     * Create a listener
     *
     * @param {any} options
     * @param {Function} handler
     * @returns {import('libp2p-interfaces/src/transport/types').Listener}
     */
    createListener(options: any, handler: Function): import('libp2p-interfaces/src/transport/types').Listener;
    handler: Function | undefined;
    /**
     * Filter check for all Multiaddrs that this transport can dial on
     *
     * @param {Multiaddr[]} multiaddrs
     * @returns {Multiaddr[]}
     */
    filter(multiaddrs: Multiaddr[]): Multiaddr[];
    get [Symbol.toStringTag](): string;
}
declare namespace Circuit {
    export { Connection, MuxedStream };
}
import PeerId = require("peer-id");
type Connection = import("libp2p-interfaces/src/connection/connection");
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
import { Multiaddr } from "multiaddr";
//# sourceMappingURL=transport.d.ts.map
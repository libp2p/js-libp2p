export type ICircuitRelay = import('../protocol').ICircuitRelay;
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
export type Transport = import('../transport');
export type HopRequest = {
    connection: Connection;
    request: ICircuitRelay;
    streamHandler: StreamHandler;
    circuit: Transport;
};
/**
 * @typedef {import('../protocol').ICircuitRelay} ICircuitRelay
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('../transport')} Transport
 */
/**
 * @typedef {Object} HopRequest
 * @property {Connection} connection
 * @property {ICircuitRelay} request
 * @property {StreamHandler} streamHandler
 * @property {Transport} circuit
 */
/**
 * @param {HopRequest} options
 * @returns {Promise<void>}
 */
export function handleHop({ connection, request, streamHandler, circuit }: HopRequest): Promise<void>;
/**
 * Performs a HOP request to a relay peer, to request a connection to another
 * peer. A new, virtual, connection will be created between the two via the relay.
 *
 * @param {object} options
 * @param {Connection} options.connection - Connection to the relay
 * @param {ICircuitRelay} options.request
 * @returns {Promise<MuxedStream>}
 */
export function hop({ connection, request }: {
    connection: Connection;
    request: ICircuitRelay;
}): Promise<MuxedStream>;
/**
 * Performs a CAN_HOP request to a relay peer, in order to understand its capabilities.
 *
 * @param {object} options
 * @param {Connection} options.connection - Connection to the relay
 * @returns {Promise<boolean>}
 */
export function canHop({ connection }: {
    connection: Connection;
}): Promise<boolean>;
/**
 * Creates an unencoded CAN_HOP response based on the Circuits configuration
 *
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {StreamHandler} options.streamHandler
 * @param {Transport} options.circuit
 * @private
 */
export function handleCanHop({ connection, streamHandler, circuit }: {
    connection: Connection;
    streamHandler: StreamHandler;
    circuit: Transport;
}): void;
import StreamHandler = require("./stream-handler");
//# sourceMappingURL=hop.d.ts.map
export type CircuitRequest = {
    type: import("../../types").CircuitType;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type Transport = import("../transport");
export type HopRequest = {
    connection: Connection;
    request: CircuitRequest;
    streamHandler: StreamHandler;
    circuit: Transport;
};
/**
 * @typedef {import('../../types').CircuitRequest} CircuitRequest
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('../transport')} Transport
 */
/**
 * @typedef {Object} HopRequest
 * @property {Connection} connection
 * @property {CircuitRequest} request
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
 * @param {CircuitRequest} options.request
 * @returns {Promise<Connection>}
 */
export function hop({ connection, request }: {
    connection: Connection;
    request: CircuitRequest;
}): Promise<Connection>;
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
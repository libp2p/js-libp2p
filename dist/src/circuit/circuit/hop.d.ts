export type CircuitRequest = {
    type: import("../../types").CircuitType;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type StreamHandlerT = import("./stream-handler")<import("../../types").CircuitRequest>;
export type Transport = import("../transport");
export type HopRequest = {
    connection: Connection;
    request: CircuitRequest;
    streamHandler: import("./stream-handler")<import("../../types").CircuitRequest>;
    circuit: Transport;
};
/**
 * @typedef {import('../../types').CircuitRequest} CircuitRequest
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('./stream-handler')<CircuitRequest>} StreamHandlerT
 * @typedef {import('../transport')} Transport
 */
/**
 * @typedef {Object} HopRequest
 * @property {Connection} connection
 * @property {CircuitRequest} request
 * @property {StreamHandlerT} streamHandler
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
 * @param {StreamHandlerT} options.streamHandler
 * @param {Transport} options.circuit
 * @private
 */
export function handleCanHop({ connection, streamHandler, circuit }: {
    connection: Connection;
    streamHandler: import("./stream-handler")<import("../../types").CircuitRequest>;
    circuit: Transport;
}): void;
//# sourceMappingURL=hop.d.ts.map
export = StreamHandler;
/**
 * @typedef {import('../../types').CircuitRequest} CircuitRequest
 * @typedef {import('../../types').CircuitMessage} CircuitMessage
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
declare class StreamHandler {
    /**
     * Create a stream handler for connection
     *
     * @class
     * @param {object} options
     * @param {MuxedStream} options.stream - A duplex iterable
     * @param {number} [options.maxLength = 4096] - max bytes length of message
     */
    constructor({ stream, maxLength }: {
        stream: MuxedStream;
        maxLength: number | undefined;
    });
    stream: import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
    shake: any;
    decoder: AsyncGenerator<Buffer | import("bl"), import("bl"), unknown>;
    /**
     * Read and decode message
     *
     * @async
     * @returns {Promise<CircuitRequest|undefined>}
     */
    read(): Promise<CircuitRequest | undefined>;
    /**
     * Encode and write array of buffers
     *
     * @param {CircuitMessage} msg - An unencoded CircuitRelay protobuf message
     * @returns {void}
     */
    write(msg: CircuitMessage): void;
    /**
     * Return the handshake rest stream and invalidate handler
     *
     * @returns {*} A duplex iterable
     */
    rest(): any;
    /**
     * @param {CircuitMessage} msg
     */
    end(msg: CircuitMessage): void;
    /**
     * Close the stream
     *
     * @returns {void}
     */
    close(): void;
}
declare namespace StreamHandler {
    export { CircuitRequest, CircuitMessage, MuxedStream };
}
type CircuitRequest = {
    type: import("../../types").CircuitType;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
type CircuitMessage = {
    type?: 4 | 1 | 2 | 3 | undefined;
    dstPeer?: import("../../types").CircuitPeer | undefined;
    srcPeer?: import("../../types").CircuitPeer | undefined;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
};
type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
//# sourceMappingURL=stream-handler.d.ts.map
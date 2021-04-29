export = StreamHandler;
/**
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('../protocol').ICircuitRelay} ICircuitRelay
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
        maxLength?: number | undefined;
    });
    stream: import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
    shake: any;
    decoder: AsyncGenerator<any, void, unknown>;
    /**
     * Read and decode message
     *
     * @async
     */
    read(): Promise<CircuitRelay | undefined>;
    /**
     * Encode and write array of buffers
     *
     * @param {ICircuitRelay} msg - An unencoded CircuitRelay protobuf message
     * @returns {void}
     */
    write(msg: ICircuitRelay): void;
    /**
     * Return the handshake rest stream and invalidate handler
     *
     * @returns {*} A duplex iterable
     */
    rest(): any;
    /**
     * @param {ICircuitRelay} msg - An unencoded CircuitRelay protobuf message
     */
    end(msg: ICircuitRelay): void;
    /**
     * Close the stream
     *
     * @returns {void}
     */
    close(): void;
}
declare namespace StreamHandler {
    export { MuxedStream, ICircuitRelay };
}
import { CircuitRelay } from "../protocol";
type ICircuitRelay = import('../protocol').ICircuitRelay;
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
//# sourceMappingURL=stream-handler.d.ts.map
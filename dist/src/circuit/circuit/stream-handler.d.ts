export = StreamHandler;
/**
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
/**
 * @template T
 */
declare class StreamHandler<T> {
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
     * @returns {Promise<T|undefined>}
     */
    read(): Promise<T | undefined>;
    /**
     * Encode and write array of buffers
     *
     * @param {CircuitPB} msg - An unencoded CircuitRelay protobuf message
     * @returns {void}
     */
    write(msg: any): void;
    /**
     * Return the handshake rest stream and invalidate handler
     *
     * @returns {*} A duplex iterable
     */
    rest(): any;
    end(msg: any): void;
    /**
     * Close the stream
     *
     * @returns {void}
     */
    close(): void;
}
declare namespace StreamHandler {
    export { MuxedStream };
}
type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
//# sourceMappingURL=stream-handler.d.ts.map
export = IdentifyService;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
declare class IdentifyService {
    /**
     * Takes the `addr` and converts it to a Multiaddr if possible
     *
     * @param {Uint8Array | string} addr
     * @returns {multiaddr|null}
     */
    static getCleanMultiaddr(addr: Uint8Array | string): import("multiaddr") | null;
    /**
     * @class
     * @param {Object} options
     * @param {import('../')} options.libp2p
     */
    constructor({ libp2p }: {
        libp2p: import('../');
    });
    _libp2p: import("..");
    peerStore: import("../peer-store");
    connectionManager: import("../connection-manager");
    peerId: import("peer-id");
    /**
     * A handler to register with Libp2p to process identify messages.
     *
     * @param {Object} options
     * @param {Connection} options.connection
     * @param {MuxedStream} options.stream
     * @param {string} options.protocol
     * @returns {Promise<void>|undefined}
     */
    handleMessage({ connection, stream, protocol }: {
        connection: Connection;
        stream: MuxedStream;
        protocol: string;
    }): Promise<void> | undefined;
    _host: any;
    /**
     * Send an Identify Push update to the list of connections
     *
     * @param {Connection[]} connections
     * @returns {Promise<void[]>}
     */
    push(connections: Connection[]): Promise<void[]>;
    /**
     * Calls `push` for all peers in the `peerStore` that are connected
     *
     * @returns {void}
     */
    pushToPeerStore(): void;
    /**
     * Requests the `Identify` message from peer associated with the given `connection`.
     * If the identified peer does not match the `PeerId` associated with the connection,
     * an error will be thrown.
     *
     * @async
     * @param {Connection} connection
     * @returns {Promise<void>}
     */
    identify(connection: Connection): Promise<void>;
    /**
     * Sends the `Identify` response with the Signed Peer Record
     * to the requesting peer over the given `connection`
     *
     * @private
     * @param {Object} options
     * @param {MuxedStream} options.stream
     * @param {Connection} options.connection
     * @returns {Promise<void>}
     */
    private _handleIdentify;
    /**
     * Reads the Identify Push message from the given `connection`
     *
     * @private
     * @param {object} options
     * @param {MuxedStream} options.stream
     * @param {Connection} options.connection
     * @returns {Promise<void>}
     */
    private _handlePush;
}
declare namespace IdentifyService {
    export { multicodecs, Message as Messsage, Connection, MuxedStream };
}
type Connection = import("libp2p-interfaces/src/connection/connection");
type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
declare namespace multicodecs {
    export { MULTICODEC_IDENTIFY as IDENTIFY };
    export { MULTICODEC_IDENTIFY_PUSH as IDENTIFY_PUSH };
}
declare const Message: any;
declare const MULTICODEC_IDENTIFY: string;
declare const MULTICODEC_IDENTIFY_PUSH: string;
//# sourceMappingURL=index.d.ts.map
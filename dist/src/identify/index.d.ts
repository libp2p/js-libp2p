export = IdentifyService;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
/**
 * @typedef {Object} HostProperties
 * @property {string} agentVersion
 */
declare class IdentifyService {
    /**
     * @param {import('../')} libp2p
     */
    static getProtocolStr(libp2p: import('../')): {
        identifyProtocolStr: string;
        identifyPushProtocolStr: string;
    };
    /**
     * Takes the `addr` and converts it to a Multiaddr if possible
     *
     * @param {Uint8Array | string} addr
     * @returns {Multiaddr|null}
     */
    static getCleanMultiaddr(addr: Uint8Array | string): Multiaddr | null;
    /**
     * @class
     * @param {Object} options
     * @param {import('../')} options.libp2p
     */
    constructor({ libp2p }: {
        libp2p: import('../');
    });
    _libp2p: import("../");
    peerStore: import("../peer-store/types").PeerStore;
    addressManager: import("../address-manager");
    connectionManager: import("../connection-manager");
    peerId: PeerId;
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
    identifyProtocolStr: string;
    identifyPushProtocolStr: string;
    _host: {
        agentVersion: string;
        protocolVersion: string;
    };
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Send an Identify Push update to the list of connections
     *
     * @param {Connection[]} connections
     * @returns {Promise<void[]>}
     */
    push(connections: Connection[]): Promise<void[]>;
    /**
     * Calls `push` for all peers in the `peerStore` that are connected
     */
    pushToPeerStore(): Promise<void>;
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
    export { multicodecs, Message as Messsage, Connection, MuxedStream, HostProperties };
}
import PeerId = require("peer-id");
type Connection = import("libp2p-interfaces/src/connection/connection");
import { Multiaddr } from "multiaddr";
declare namespace multicodecs {
    export { MULTICODEC_IDENTIFY as IDENTIFY };
    export { MULTICODEC_IDENTIFY_PUSH as IDENTIFY_PUSH };
}
import Message = require("./message");
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
type HostProperties = {
    agentVersion: string;
};
import { MULTICODEC_IDENTIFY } from "./consts";
import { MULTICODEC_IDENTIFY_PUSH } from "./consts";
//# sourceMappingURL=index.d.ts.map
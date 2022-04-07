export = Upgrader;
/**
 * @typedef {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} MultiaddrConnection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory} MuxerFactory
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').Muxer} Muxer
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('libp2p-interfaces/src/crypto/types').Crypto} Crypto
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('./types').ConnectionGater} ConnectionGater
 */
/**
 * @typedef CryptoResult
 * @property {MultiaddrConnection} conn A duplex iterable
 * @property {PeerId} remotePeer
 * @property {string} protocol
 */
declare class Upgrader {
    /**
     * @param {object} options
     * @param {PeerId} options.localPeer
     * @param {ConnectionGater} options.connectionGater
     *
     * @param {import('./metrics')} [options.metrics]
     * @param {Map<string, Crypto>} [options.cryptos]
     * @param {Map<string, MuxerFactory>} [options.muxers]
     * @param {(connection: Connection) => void} options.onConnection - Called when a connection is upgraded
     * @param {(connection: Connection) => void} options.onConnectionEnd
     */
    constructor({ localPeer, metrics, connectionGater, cryptos, muxers, onConnectionEnd, onConnection }: {
        localPeer: PeerId;
        connectionGater: ConnectionGater;
        metrics?: import("./metrics") | undefined;
        cryptos?: Map<string, import("libp2p-interfaces/src/crypto/types").Crypto> | undefined;
        muxers?: Map<string, import("libp2p-interfaces/src/stream-muxer/types").MuxerFactory> | undefined;
        onConnection: (connection: Connection) => void;
        onConnectionEnd: (connection: Connection) => void;
    });
    connectionGater: import("./types").ConnectionGater;
    localPeer: PeerId;
    metrics: import("./metrics") | undefined;
    cryptos: Map<string, import("libp2p-interfaces/src/crypto/types").Crypto>;
    muxers: Map<string, import("libp2p-interfaces/src/stream-muxer/types").MuxerFactory>;
    /** @type {import("./pnet") | null} */
    protector: import("./pnet") | null;
    protocols: Map<any, any>;
    onConnection: (connection: Connection) => void;
    onConnectionEnd: (connection: Connection) => void;
    /**
     * Upgrades an inbound connection
     *
     * @async
     * @param {MultiaddrConnection} maConn
     * @returns {Promise<Connection>}
     */
    upgradeInbound(maConn: MultiaddrConnection): Promise<Connection>;
    /**
     * Upgrades an outbound connection
     *
     * @async
     * @param {MultiaddrConnection} maConn
     * @returns {Promise<Connection>}
     */
    upgradeOutbound(maConn: MultiaddrConnection): Promise<Connection>;
    /**
     * A convenience method for generating a new `Connection`
     *
     * @private
     * @param {object} options
     * @param {string} options.cryptoProtocol - The crypto protocol that was negotiated
     * @param {'inbound' | 'outbound'} options.direction - One of ['inbound', 'outbound']
     * @param {MultiaddrConnection} options.maConn - The transport layer connection
     * @param {MuxedStream | MultiaddrConnection} options.upgradedConn - A duplex connection returned from multiplexer and/or crypto selection
     * @param {MuxerFactory} [options.Muxer] - The muxer to be used for muxing
     * @param {PeerId} options.remotePeer - The peer the connection is with
     * @returns {Connection}
     */
    private _createConnection;
    /**
     * Routes incoming streams to the correct handler
     *
     * @private
     * @param {object} options
     * @param {Connection} options.connection - The connection the stream belongs to
     * @param {MuxedStream} options.stream
     * @param {string} options.protocol
     */
    private _onStream;
    /**
     * Attempts to encrypt the incoming `connection` with the provided `cryptos`.
     *
     * @private
     * @async
     * @param {PeerId} localPeer - The initiators PeerId
     * @param {*} connection
     * @param {Map<string, Crypto>} cryptos
     * @returns {Promise<CryptoResult>} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
     */
    private _encryptInbound;
    /**
     * Attempts to encrypt the given `connection` with the provided `cryptos`.
     * The first `Crypto` module to succeed will be used
     *
     * @private
     * @async
     * @param {PeerId} localPeer - The initiators PeerId
     * @param {MultiaddrConnection} connection
     * @param {PeerId} remotePeerId
     * @param {Map<string, Crypto>} cryptos
     * @returns {Promise<CryptoResult>} An encrypted connection, remote peer `PeerId` and the protocol of the `Crypto` used
     */
    private _encryptOutbound;
    /**
     * Selects one of the given muxers via multistream-select. That
     * muxer will be used for all future streams on the connection.
     *
     * @private
     * @async
     * @param {MultiaddrConnection} connection - A basic duplex connection to multiplex
     * @param {Map<string, MuxerFactory>} muxers - The muxers to attempt multiplexing with
     * @returns {Promise<{ stream: MuxedStream, Muxer?: MuxerFactory}>} A muxed connection
     */
    private _multiplexOutbound;
    /**
     * Registers support for one of the given muxers via multistream-select. The
     * selected muxer will be used for all future streams on the connection.
     *
     * @private
     * @async
     * @param {MultiaddrConnection} connection - A basic duplex connection to multiplex
     * @param {Map<string, MuxerFactory>} muxers - The muxers to attempt multiplexing with
     * @returns {Promise<{ stream: MuxedStream, Muxer?: MuxerFactory}>} A muxed connection
     */
    private _multiplexInbound;
}
declare namespace Upgrader {
    export { MultiaddrConnection, MuxerFactory, Muxer, MuxedStream, Crypto, Connection, Multiaddr, ConnectionGater, CryptoResult };
}
import PeerId = require("peer-id");
type MultiaddrConnection = import('libp2p-interfaces/src/transport/types').MultiaddrConnection;
import { Connection } from "libp2p-interfaces/src/connection";
type ConnectionGater = import('./types').ConnectionGater;
type MuxerFactory = import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory;
type Muxer = import('libp2p-interfaces/src/stream-muxer/types').Muxer;
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
type Crypto = import('libp2p-interfaces/src/crypto/types').Crypto;
type Connection = import("libp2p-interfaces/src/connection/connection");
type Multiaddr = import('multiaddr').Multiaddr;
type CryptoResult = {
    /**
     * A duplex iterable
     */
    conn: MultiaddrConnection;
    remotePeer: PeerId;
    protocol: string;
};
//# sourceMappingURL=upgrader.d.ts.map
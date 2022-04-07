export = PingService;
/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */
declare class PingService {
    /**
     * @param {import('../')} libp2p
     */
    static getProtocolStr(libp2p: import('../')): string;
    /**
     * @param {Libp2p} libp2p
     */
    constructor(libp2p: Libp2p);
    _libp2p: import("../");
    /**
     * A handler to register with Libp2p to process ping messages
     *
     * @param {Object} options
     * @param {MuxedStream} options.stream
     */
    handleMessage({ stream }: {
        stream: MuxedStream;
    }): any;
    /**
     * Ping a given peer and wait for its response, getting the operation latency.
     *
     * @param {PeerId|Multiaddr} peer
     * @returns {Promise<number>}
     */
    ping(peer: PeerId | Multiaddr): Promise<number>;
}
declare namespace PingService {
    export { Libp2p, Multiaddr, PeerId, MuxedStream };
}
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
type PeerId = import('peer-id');
type Multiaddr = import('multiaddr').Multiaddr;
type Libp2p = import('../');
//# sourceMappingURL=index.d.ts.map
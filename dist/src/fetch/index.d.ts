export = FetchProtocol;
/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {(key: string) => Promise<Uint8Array | null>} LookupFunction
 */
/**
 * A simple libp2p protocol for requesting a value corresponding to a key from a peer.
 * Developers can register one or more lookup function for retrieving the value corresponding to
 * a given key.  Each lookup function must act on a distinct part of the overall key space, defined
 * by a fixed prefix that all keys that should be routed to that lookup function will start with.
 */
declare class FetchProtocol {
    /**
     * @param {Libp2p} libp2p
     */
    constructor(libp2p: Libp2p);
    _lookupFunctions: Map<any, any>;
    _libp2p: import("../");
    /**
     * Invoked when a fetch request is received.  Reads the request message off the given stream and
     * responds based on looking up the key in the request via the lookup callback that corresponds
     * to the key's prefix.
     *
     * @param {object} options
     * @param {MuxedStream} options.stream
     * @param {string} options.protocol
     */
    handleMessage(options: {
        stream: MuxedStream;
        protocol: string;
    }): Promise<void>;
    /**
     * Sends a request to fetch the value associated with the given key from the given peer.
     *
     * @param {PeerId|Multiaddr} peer
     * @param {string} key
     * @returns {Promise<Uint8Array | null>}
     */
    fetch(peer: PeerId | Multiaddr, key: string): Promise<Uint8Array | null>;
    /**
     * Given a key, finds the appropriate function for looking up its corresponding value, based on
     * the key's prefix.
     *
     * @param {string} key
     */
    _getLookupFunction(key: string): any;
    /**
     * Registers a new lookup callback that can map keys to values, for a given set of keys that
     * share the same prefix.
     *
     * @param {string} prefix
     * @param {LookupFunction} lookup
     */
    registerLookupFunction(prefix: string, lookup: LookupFunction): void;
    /**
     * Registers a new lookup callback that can map keys to values, for a given set of keys that
     * share the same prefix.
     *
     * @param {string} prefix
     * @param {LookupFunction} [lookup]
     */
    unregisterLookupFunction(prefix: string, lookup?: LookupFunction | undefined): void;
}
declare namespace FetchProtocol {
    export { PROTOCOL, Libp2p, Multiaddr, PeerId, MuxedStream, LookupFunction };
}
type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
type PeerId = import('peer-id');
type Multiaddr = import('multiaddr').Multiaddr;
type LookupFunction = (key: string) => Promise<Uint8Array | null>;
type Libp2p = import('../');
import { PROTOCOL } from "./constants";
//# sourceMappingURL=index.d.ts.map
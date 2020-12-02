export = PeerRecord;
/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('libp2p-interfaces/src/record/types').Record} Record
 */
/**
 * @implements {Record}
 */
declare class PeerRecord implements Record {
    /**
     * The PeerRecord is used for distributing peer routing records across the network.
     * It contains the peer's reachable listen addresses.
     *
     * @class
     * @param {Object} params
     * @param {PeerId} params.peerId
     * @param {Multiaddr[]} params.multiaddrs - addresses of the associated peer.
     * @param {number} [params.seqNumber] - monotonically-increasing sequence counter that's used to order PeerRecords in time.
     */
    constructor({ peerId, multiaddrs, seqNumber }: {
        peerId: PeerId;
        multiaddrs: Multiaddr[];
        seqNumber: number | undefined;
    });
    domain: any;
    codec: Uint8Array;
    peerId: import("peer-id");
    multiaddrs: import("multiaddr")[];
    seqNumber: number;
    _marshal: Uint8Array | undefined;
    /**
     * Marshal a record to be used in an envelope.
     *
     * @returns {Uint8Array}
     */
    marshal(): Uint8Array;
    /**
     * Returns true if `this` record equals the `other`.
     *
     * @param {unknown} other
     * @returns {boolean}
     */
    equals(other: unknown): boolean;
}
declare namespace PeerRecord {
    export { createFromProtobuf, ENVELOPE_DOMAIN_PEER_RECORD as DOMAIN, PeerId, Multiaddr, Record };
}
declare const PeerId_1: typeof import("peer-id");
type Multiaddr = import("multiaddr");
declare function createFromProtobuf(buf: Uint8Array): PeerRecord;
declare const ENVELOPE_DOMAIN_PEER_RECORD: any;
type PeerId = import("peer-id");
type Record = import("libp2p-interfaces/src/record/types").Record;
//# sourceMappingURL=index.d.ts.map
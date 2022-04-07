export = PeerRecord;
/**
 * @typedef {import('../../peer-store/types').Address} Address
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
        seqNumber?: number | undefined;
    });
    domain: string;
    codec: Uint8Array;
    peerId: PeerId;
    multiaddrs: Multiaddr[];
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
    export { createFromProtobuf, ENVELOPE_DOMAIN_PEER_RECORD as DOMAIN, Address, Record };
}
type Record = import('libp2p-interfaces/src/record/types').Record;
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
/**
 * Unmarshal Peer Record Protobuf.
 *
 * @param {Uint8Array} buf - marshaled peer record.
 * @returns {PeerRecord}
 */
declare function createFromProtobuf(buf: Uint8Array): PeerRecord;
import { ENVELOPE_DOMAIN_PEER_RECORD } from "./consts";
type Address = import('../../peer-store/types').Address;
//# sourceMappingURL=index.d.ts.map
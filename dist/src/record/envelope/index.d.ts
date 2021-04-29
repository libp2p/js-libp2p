export = Envelope;
/**
 * @typedef {import('libp2p-interfaces/src/record/types').Record} Record
 */
declare class Envelope {
    /**
     * The Envelope is responsible for keeping an arbitrary signed record
     * by a libp2p peer.
     *
     * @class
     * @param {object} params
     * @param {PeerId} params.peerId
     * @param {Uint8Array} params.payloadType
     * @param {Uint8Array} params.payload - marshaled record
     * @param {Uint8Array} params.signature - signature of the domain string :: type hint :: payload.
     */
    constructor({ peerId, payloadType, payload, signature }: {
        peerId: PeerId;
        payloadType: Uint8Array;
        payload: Uint8Array;
        signature: Uint8Array;
    });
    peerId: PeerId;
    payloadType: Uint8Array;
    payload: Uint8Array;
    signature: Uint8Array;
    _marshal: Uint8Array | undefined;
    /**
     * Marshal the envelope content.
     *
     * @returns {Uint8Array}
     */
    marshal(): Uint8Array;
    /**
     * Verifies if the other Envelope is identical to this one.
     *
     * @param {Envelope} other
     * @returns {boolean}
     */
    equals(other: Envelope): boolean;
    /**
     * Validate envelope data signature for the given domain.
     *
     * @param {string} domain
     * @returns {Promise<boolean>}
     */
    validate(domain: string): Promise<boolean>;
}
declare namespace Envelope {
    export { createFromProtobuf, seal, openAndCertify, Record };
}
import PeerId = require("peer-id");
declare function createFromProtobuf(data: Uint8Array): Promise<Envelope>;
declare function seal(record: Record, peerId: PeerId): Promise<Envelope>;
declare function openAndCertify(data: Uint8Array, domain: string): Promise<Envelope>;
type Record = import('libp2p-interfaces/src/record/types').Record;
//# sourceMappingURL=index.d.ts.map
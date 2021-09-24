import * as $protobuf from "protobufjs";
/** Properties of a PeerRecord. */
export interface IPeerRecord {

    /** PeerRecord peerId */
    peerId?: (Uint8Array|null);

    /** PeerRecord seq */
    seq?: (number|null);

    /** PeerRecord addresses */
    addresses?: (PeerRecord.IAddressInfo[]|null);
}

/** Represents a PeerRecord. */
export class PeerRecord implements IPeerRecord {

    /**
     * Constructs a new PeerRecord.
     * @param [p] Properties to set
     */
    constructor(p?: IPeerRecord);

    /** PeerRecord peerId. */
    public peerId: Uint8Array;

    /** PeerRecord seq. */
    public seq: number;

    /** PeerRecord addresses. */
    public addresses: PeerRecord.IAddressInfo[];

    /**
     * Encodes the specified PeerRecord message. Does not implicitly {@link PeerRecord.verify|verify} messages.
     * @param m PeerRecord message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IPeerRecord, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a PeerRecord message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns PeerRecord
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): PeerRecord;

    /**
     * Creates a PeerRecord message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns PeerRecord
     */
    public static fromObject(d: { [k: string]: any }): PeerRecord;

    /**
     * Creates a plain object from a PeerRecord message. Also converts values to other types if specified.
     * @param m PeerRecord
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: PeerRecord, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this PeerRecord to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace PeerRecord {

    /** Properties of an AddressInfo. */
    interface IAddressInfo {

        /** AddressInfo multiaddr */
        multiaddr?: (Uint8Array|null);
    }

    /** Represents an AddressInfo. */
    class AddressInfo implements IAddressInfo {

        /**
         * Constructs a new AddressInfo.
         * @param [p] Properties to set
         */
        constructor(p?: PeerRecord.IAddressInfo);

        /** AddressInfo multiaddr. */
        public multiaddr: Uint8Array;

        /**
         * Encodes the specified AddressInfo message. Does not implicitly {@link PeerRecord.AddressInfo.verify|verify} messages.
         * @param m AddressInfo message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: PeerRecord.IAddressInfo, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AddressInfo message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns AddressInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): PeerRecord.AddressInfo;

        /**
         * Creates an AddressInfo message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns AddressInfo
         */
        public static fromObject(d: { [k: string]: any }): PeerRecord.AddressInfo;

        /**
         * Creates a plain object from an AddressInfo message. Also converts values to other types if specified.
         * @param m AddressInfo
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: PeerRecord.AddressInfo, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AddressInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}

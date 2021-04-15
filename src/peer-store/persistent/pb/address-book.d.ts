import * as $protobuf from "protobufjs";
/** Properties of an Addresses. */
export interface IAddresses {

    /** Addresses addrs */
    addrs?: (Addresses.IAddress[]|null);

    /** Addresses certifiedRecord */
    certifiedRecord?: (Addresses.ICertifiedRecord|null);
}

/** Represents an Addresses. */
export class Addresses implements IAddresses {

    /**
     * Constructs a new Addresses.
     * @param [p] Properties to set
     */
    constructor(p?: IAddresses);

    /** Addresses addrs. */
    public addrs: Addresses.IAddress[];

    /** Addresses certifiedRecord. */
    public certifiedRecord?: (Addresses.ICertifiedRecord|null);

    /**
     * Encodes the specified Addresses message. Does not implicitly {@link Addresses.verify|verify} messages.
     * @param m Addresses message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IAddresses, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Addresses message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Addresses
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Addresses;

    /**
     * Creates an Addresses message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Addresses
     */
    public static fromObject(d: { [k: string]: any }): Addresses;

    /**
     * Creates a plain object from an Addresses message. Also converts values to other types if specified.
     * @param m Addresses
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Addresses, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Addresses to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace Addresses {

    /** Properties of an Address. */
    interface IAddress {

        /** Address multiaddr */
        multiaddr?: (Uint8Array|null);

        /** Address isCertified */
        isCertified?: (boolean|null);
    }

    /** Represents an Address. */
    class Address implements IAddress {

        /**
         * Constructs a new Address.
         * @param [p] Properties to set
         */
        constructor(p?: Addresses.IAddress);

        /** Address multiaddr. */
        public multiaddr: Uint8Array;

        /** Address isCertified. */
        public isCertified: boolean;

        /**
         * Encodes the specified Address message. Does not implicitly {@link Addresses.Address.verify|verify} messages.
         * @param m Address message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: Addresses.IAddress, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Address message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns Address
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Addresses.Address;

        /**
         * Creates an Address message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns Address
         */
        public static fromObject(d: { [k: string]: any }): Addresses.Address;

        /**
         * Creates a plain object from an Address message. Also converts values to other types if specified.
         * @param m Address
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: Addresses.Address, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Address to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a CertifiedRecord. */
    interface ICertifiedRecord {

        /** CertifiedRecord seq */
        seq?: (number|null);

        /** CertifiedRecord raw */
        raw?: (Uint8Array|null);
    }

    /** Represents a CertifiedRecord. */
    class CertifiedRecord implements ICertifiedRecord {

        /**
         * Constructs a new CertifiedRecord.
         * @param [p] Properties to set
         */
        constructor(p?: Addresses.ICertifiedRecord);

        /** CertifiedRecord seq. */
        public seq: number;

        /** CertifiedRecord raw. */
        public raw: Uint8Array;

        /**
         * Encodes the specified CertifiedRecord message. Does not implicitly {@link Addresses.CertifiedRecord.verify|verify} messages.
         * @param m CertifiedRecord message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: Addresses.ICertifiedRecord, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CertifiedRecord message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns CertifiedRecord
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Addresses.CertifiedRecord;

        /**
         * Creates a CertifiedRecord message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns CertifiedRecord
         */
        public static fromObject(d: { [k: string]: any }): Addresses.CertifiedRecord;

        /**
         * Creates a plain object from a CertifiedRecord message. Also converts values to other types if specified.
         * @param m CertifiedRecord
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: Addresses.CertifiedRecord, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CertifiedRecord to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}

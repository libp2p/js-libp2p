import * as $protobuf from "protobufjs";
/** Properties of a Peer. */
export interface IPeer {

    /** Peer addresses */
    addresses?: (IAddress[]|null);

    /** Peer protocols */
    protocols?: (string[]|null);

    /** Peer metadata */
    metadata?: (IMetadata[]|null);

    /** Peer pubKey */
    pubKey?: (Uint8Array|null);

    /** Peer peerRecordEnvelope */
    peerRecordEnvelope?: (Uint8Array|null);
}

/** Represents a Peer. */
export class Peer implements IPeer {

    /**
     * Constructs a new Peer.
     * @param [p] Properties to set
     */
    constructor(p?: IPeer);

    /** Peer addresses. */
    public addresses: IAddress[];

    /** Peer protocols. */
    public protocols: string[];

    /** Peer metadata. */
    public metadata: IMetadata[];

    /** Peer pubKey. */
    public pubKey?: (Uint8Array|null);

    /** Peer peerRecordEnvelope. */
    public peerRecordEnvelope?: (Uint8Array|null);

    /** Peer _pubKey. */
    public _pubKey?: "pubKey";

    /** Peer _peerRecordEnvelope. */
    public _peerRecordEnvelope?: "peerRecordEnvelope";

    /**
     * Encodes the specified Peer message. Does not implicitly {@link Peer.verify|verify} messages.
     * @param m Peer message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IPeer, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Peer message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Peer
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Peer;

    /**
     * Creates a Peer message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Peer
     */
    public static fromObject(d: { [k: string]: any }): Peer;

    /**
     * Creates a plain object from a Peer message. Also converts values to other types if specified.
     * @param m Peer
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Peer, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Peer to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of an Address. */
export interface IAddress {

    /** Address multiaddr */
    multiaddr?: (Uint8Array|null);

    /** Address isCertified */
    isCertified?: (boolean|null);
}

/** Represents an Address. */
export class Address implements IAddress {

    /**
     * Constructs a new Address.
     * @param [p] Properties to set
     */
    constructor(p?: IAddress);

    /** Address multiaddr. */
    public multiaddr: Uint8Array;

    /** Address isCertified. */
    public isCertified?: (boolean|null);

    /** Address _isCertified. */
    public _isCertified?: "isCertified";

    /**
     * Encodes the specified Address message. Does not implicitly {@link Address.verify|verify} messages.
     * @param m Address message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IAddress, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Address message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Address
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Address;

    /**
     * Creates an Address message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Address
     */
    public static fromObject(d: { [k: string]: any }): Address;

    /**
     * Creates a plain object from an Address message. Also converts values to other types if specified.
     * @param m Address
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Address, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Address to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a Metadata. */
export interface IMetadata {

    /** Metadata key */
    key?: (string|null);

    /** Metadata value */
    value?: (Uint8Array|null);
}

/** Represents a Metadata. */
export class Metadata implements IMetadata {

    /**
     * Constructs a new Metadata.
     * @param [p] Properties to set
     */
    constructor(p?: IMetadata);

    /** Metadata key. */
    public key: string;

    /** Metadata value. */
    public value: Uint8Array;

    /**
     * Encodes the specified Metadata message. Does not implicitly {@link Metadata.verify|verify} messages.
     * @param m Metadata message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IMetadata, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Metadata message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Metadata;

    /**
     * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Metadata
     */
    public static fromObject(d: { [k: string]: any }): Metadata;

    /**
     * Creates a plain object from a Metadata message. Also converts values to other types if specified.
     * @param m Metadata
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Metadata, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Metadata to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

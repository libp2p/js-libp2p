import * as $protobuf from "protobufjs";
/** Properties of an Exchange. */
export interface IExchange {

    /** Exchange id */
    id?: (Uint8Array|null);

    /** Exchange pubkey */
    pubkey?: (IPublicKey|null);
}

/** Represents an Exchange. */
export class Exchange implements IExchange {

    /**
     * Constructs a new Exchange.
     * @param [p] Properties to set
     */
    constructor(p?: IExchange);

    /** Exchange id. */
    public id: Uint8Array;

    /** Exchange pubkey. */
    public pubkey?: (IPublicKey|null);

    /**
     * Encodes the specified Exchange message. Does not implicitly {@link Exchange.verify|verify} messages.
     * @param m Exchange message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IExchange, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Exchange message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Exchange
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Exchange;

    /**
     * Creates an Exchange message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Exchange
     */
    public static fromObject(d: { [k: string]: any }): Exchange;

    /**
     * Creates a plain object from an Exchange message. Also converts values to other types if specified.
     * @param m Exchange
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Exchange, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Exchange to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** KeyType enum. */
export enum KeyType {
    RSA = 0,
    Ed25519 = 1,
    Secp256k1 = 2,
    ECDSA = 3
}

/** Represents a PublicKey. */
export class PublicKey implements IPublicKey {

    /**
     * Constructs a new PublicKey.
     * @param [p] Properties to set
     */
    constructor(p?: IPublicKey);

    /** PublicKey Type. */
    public Type: KeyType;

    /** PublicKey Data. */
    public Data: Uint8Array;

    /**
     * Encodes the specified PublicKey message. Does not implicitly {@link PublicKey.verify|verify} messages.
     * @param m PublicKey message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IPublicKey, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a PublicKey message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns PublicKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): PublicKey;

    /**
     * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns PublicKey
     */
    public static fromObject(d: { [k: string]: any }): PublicKey;

    /**
     * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
     * @param m PublicKey
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: PublicKey, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this PublicKey to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

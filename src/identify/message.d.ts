import * as $protobuf from "protobufjs";
/** Properties of an Identify. */
export interface IIdentify {

    /** Identify protocolVersion */
    protocolVersion?: (string|null);

    /** Identify agentVersion */
    agentVersion?: (string|null);

    /** Identify publicKey */
    publicKey?: (Uint8Array|null);

    /** Identify listenAddrs */
    listenAddrs?: (Uint8Array[]|null);

    /** Identify observedAddr */
    observedAddr?: (Uint8Array|null);

    /** Identify protocols */
    protocols?: (string[]|null);

    /** Identify signedPeerRecord */
    signedPeerRecord?: (Uint8Array|null);
}

/** Represents an Identify. */
export class Identify implements IIdentify {

    /**
     * Constructs a new Identify.
     * @param [p] Properties to set
     */
    constructor(p?: IIdentify);

    /** Identify protocolVersion. */
    public protocolVersion: string;

    /** Identify agentVersion. */
    public agentVersion: string;

    /** Identify publicKey. */
    public publicKey: Uint8Array;

    /** Identify listenAddrs. */
    public listenAddrs: Uint8Array[];

    /** Identify observedAddr. */
    public observedAddr: Uint8Array;

    /** Identify protocols. */
    public protocols: string[];

    /** Identify signedPeerRecord. */
    public signedPeerRecord: Uint8Array;

    /**
     * Encodes the specified Identify message. Does not implicitly {@link Identify.verify|verify} messages.
     * @param m Identify message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IIdentify, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Identify message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Identify
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Identify;

    /**
     * Creates an Identify message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Identify
     */
    public static fromObject(d: { [k: string]: any }): Identify;

    /**
     * Creates a plain object from an Identify message. Also converts values to other types if specified.
     * @param m Identify
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Identify, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Identify to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

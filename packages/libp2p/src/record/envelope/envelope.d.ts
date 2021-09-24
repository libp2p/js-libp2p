import * as $protobuf from "protobufjs";
/** Properties of an Envelope. */
export interface IEnvelope {

    /** Envelope publicKey */
    publicKey?: (Uint8Array|null);

    /** Envelope payloadType */
    payloadType?: (Uint8Array|null);

    /** Envelope payload */
    payload?: (Uint8Array|null);

    /** Envelope signature */
    signature?: (Uint8Array|null);
}

/** Represents an Envelope. */
export class Envelope implements IEnvelope {

    /**
     * Constructs a new Envelope.
     * @param [p] Properties to set
     */
    constructor(p?: IEnvelope);

    /** Envelope publicKey. */
    public publicKey: Uint8Array;

    /** Envelope payloadType. */
    public payloadType: Uint8Array;

    /** Envelope payload. */
    public payload: Uint8Array;

    /** Envelope signature. */
    public signature: Uint8Array;

    /**
     * Encodes the specified Envelope message. Does not implicitly {@link Envelope.verify|verify} messages.
     * @param m Envelope message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IEnvelope, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Envelope message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Envelope
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Envelope;

    /**
     * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Envelope
     */
    public static fromObject(d: { [k: string]: any }): Envelope;

    /**
     * Creates a plain object from an Envelope message. Also converts values to other types if specified.
     * @param m Envelope
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Envelope, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Envelope to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

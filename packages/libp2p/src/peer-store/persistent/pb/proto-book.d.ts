import * as $protobuf from "protobufjs";
/** Properties of a Protocols. */
export interface IProtocols {

    /** Protocols protocols */
    protocols?: (string[]|null);
}

/** Represents a Protocols. */
export class Protocols implements IProtocols {

    /**
     * Constructs a new Protocols.
     * @param [p] Properties to set
     */
    constructor(p?: IProtocols);

    /** Protocols protocols. */
    public protocols: string[];

    /**
     * Encodes the specified Protocols message. Does not implicitly {@link Protocols.verify|verify} messages.
     * @param m Protocols message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IProtocols, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Protocols message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Protocols
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Protocols;

    /**
     * Creates a Protocols message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Protocols
     */
    public static fromObject(d: { [k: string]: any }): Protocols;

    /**
     * Creates a plain object from a Protocols message. Also converts values to other types if specified.
     * @param m Protocols
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Protocols, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Protocols to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

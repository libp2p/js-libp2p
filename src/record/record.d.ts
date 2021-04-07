import * as $protobuf from "protobufjs";
/** Properties of a Record. */
export interface IRecord {

    /** Record key */
    key?: (Uint8Array|null);

    /** Record value */
    value?: (Uint8Array|null);

    /** Record timeReceived */
    timeReceived?: (string|null);
}

/** Represents a Record. */
export class Record implements IRecord {

    /**
     * Constructs a new Record.
     * @param [p] Properties to set
     */
    constructor(p?: IRecord);

    /** Record key. */
    public key: Uint8Array;

    /** Record value. */
    public value: Uint8Array;

    /** Record timeReceived. */
    public timeReceived: string;

    /**
     * Encodes the specified Record message. Does not implicitly {@link Record.verify|verify} messages.
     * @param m Record message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IRecord, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Record message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Record
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Record;

    /**
     * Creates a Record message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Record
     */
    public static fromObject(d: { [k: string]: any }): Record;

    /**
     * Creates a plain object from a Record message. Also converts values to other types if specified.
     * @param m Record
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Record, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Record to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

import * as $protobuf from "protobufjs";
/** Properties of a FetchRequest. */
export interface IFetchRequest {

    /** FetchRequest identifier */
    identifier?: (string|null);
}

/** Represents a FetchRequest. */
export class FetchRequest implements IFetchRequest {

    /**
     * Constructs a new FetchRequest.
     * @param [p] Properties to set
     */
    constructor(p?: IFetchRequest);

    /** FetchRequest identifier. */
    public identifier: string;

    /**
     * Encodes the specified FetchRequest message. Does not implicitly {@link FetchRequest.verify|verify} messages.
     * @param m FetchRequest message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IFetchRequest, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a FetchRequest message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns FetchRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): FetchRequest;

    /**
     * Creates a FetchRequest message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns FetchRequest
     */
    public static fromObject(d: { [k: string]: any }): FetchRequest;

    /**
     * Creates a plain object from a FetchRequest message. Also converts values to other types if specified.
     * @param m FetchRequest
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: FetchRequest, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this FetchRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a FetchResponse. */
export interface IFetchResponse {

    /** FetchResponse status */
    status?: (FetchResponse.StatusCode|null);

    /** FetchResponse data */
    data?: (Uint8Array|null);
}

/** Represents a FetchResponse. */
export class FetchResponse implements IFetchResponse {

    /**
     * Constructs a new FetchResponse.
     * @param [p] Properties to set
     */
    constructor(p?: IFetchResponse);

    /** FetchResponse status. */
    public status: FetchResponse.StatusCode;

    /** FetchResponse data. */
    public data: Uint8Array;

    /**
     * Encodes the specified FetchResponse message. Does not implicitly {@link FetchResponse.verify|verify} messages.
     * @param m FetchResponse message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IFetchResponse, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a FetchResponse message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns FetchResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): FetchResponse;

    /**
     * Creates a FetchResponse message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns FetchResponse
     */
    public static fromObject(d: { [k: string]: any }): FetchResponse;

    /**
     * Creates a plain object from a FetchResponse message. Also converts values to other types if specified.
     * @param m FetchResponse
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: FetchResponse, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this FetchResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace FetchResponse {

    /** StatusCode enum. */
    enum StatusCode {
        OK = 0,
        NOT_FOUND = 1,
        ERROR = 2
    }
}

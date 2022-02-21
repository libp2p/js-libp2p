import * as $protobuf from "protobufjs";
/** Properties of a HopMessage. */
export interface IHopMessage {

    /** HopMessage type */
    type: HopMessage.Type;

    /** HopMessage peer */
    peer?: (IPeer|null);

    /** HopMessage reservation */
    reservation?: (IReservation|null);

    /** HopMessage limit */
    limit?: (ILimit|null);

    /** HopMessage status */
    status?: (Status|null);
}

/** Represents a HopMessage. */
export class HopMessage implements IHopMessage {

    /**
     * Constructs a new HopMessage.
     * @param [p] Properties to set
     */
    constructor(p?: IHopMessage);

    /** HopMessage type. */
    public type: HopMessage.Type;

    /** HopMessage peer. */
    public peer?: (IPeer|null);

    /** HopMessage reservation. */
    public reservation?: (IReservation|null);

    /** HopMessage limit. */
    public limit?: (ILimit|null);

    /** HopMessage status. */
    public status: Status;

    /**
     * Encodes the specified HopMessage message. Does not implicitly {@link HopMessage.verify|verify} messages.
     * @param m HopMessage message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IHopMessage, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a HopMessage message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns HopMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): HopMessage;

    /**
     * Creates a HopMessage message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns HopMessage
     */
    public static fromObject(d: { [k: string]: any }): HopMessage;

    /**
     * Creates a plain object from a HopMessage message. Also converts values to other types if specified.
     * @param m HopMessage
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: HopMessage, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this HopMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace HopMessage {

    /** Type enum. */
    enum Type {
        RESERVE = 0,
        CONNECT = 1,
        STATUS = 2
    }
}

/** Properties of a StopMessage. */
export interface IStopMessage {

    /** StopMessage type */
    type: StopMessage.Type;

    /** StopMessage peer */
    peer?: (IPeer|null);

    /** StopMessage limit */
    limit?: (ILimit|null);

    /** StopMessage status */
    status?: (Status|null);
}

/** Represents a StopMessage. */
export class StopMessage implements IStopMessage {

    /**
     * Constructs a new StopMessage.
     * @param [p] Properties to set
     */
    constructor(p?: IStopMessage);

    /** StopMessage type. */
    public type: StopMessage.Type;

    /** StopMessage peer. */
    public peer?: (IPeer|null);

    /** StopMessage limit. */
    public limit?: (ILimit|null);

    /** StopMessage status. */
    public status: Status;

    /**
     * Encodes the specified StopMessage message. Does not implicitly {@link StopMessage.verify|verify} messages.
     * @param m StopMessage message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IStopMessage, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StopMessage message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns StopMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): StopMessage;

    /**
     * Creates a StopMessage message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns StopMessage
     */
    public static fromObject(d: { [k: string]: any }): StopMessage;

    /**
     * Creates a plain object from a StopMessage message. Also converts values to other types if specified.
     * @param m StopMessage
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: StopMessage, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StopMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace StopMessage {

    /** Type enum. */
    enum Type {
        CONNECT = 0,
        STATUS = 1
    }
}

/** Properties of a Peer. */
export interface IPeer {

    /** Peer id */
    id: Uint8Array;

    /** Peer addrs */
    addrs?: (Uint8Array[]|null);
}

/** Represents a Peer. */
export class Peer implements IPeer {

    /**
     * Constructs a new Peer.
     * @param [p] Properties to set
     */
    constructor(p?: IPeer);

    /** Peer id. */
    public id: Uint8Array;

    /** Peer addrs. */
    public addrs: Uint8Array[];

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

/** Properties of a Reservation. */
export interface IReservation {

    /** Reservation expire */
    expire: number;

    /** Reservation addrs */
    addrs?: (Uint8Array[]|null);

    /** Reservation voucher */
    voucher?: (Uint8Array|null);
}

/** Represents a Reservation. */
export class Reservation implements IReservation {

    /**
     * Constructs a new Reservation.
     * @param [p] Properties to set
     */
    constructor(p?: IReservation);

    /** Reservation expire. */
    public expire: number;

    /** Reservation addrs. */
    public addrs: Uint8Array[];

    /** Reservation voucher. */
    public voucher: Uint8Array;

    /**
     * Encodes the specified Reservation message. Does not implicitly {@link Reservation.verify|verify} messages.
     * @param m Reservation message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IReservation, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Reservation message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Reservation
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Reservation;

    /**
     * Creates a Reservation message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Reservation
     */
    public static fromObject(d: { [k: string]: any }): Reservation;

    /**
     * Creates a plain object from a Reservation message. Also converts values to other types if specified.
     * @param m Reservation
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Reservation, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Reservation to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a Limit. */
export interface ILimit {

    /** Limit duration */
    duration?: (number|null);

    /** Limit data */
    data?: (number|null);
}

/** Represents a Limit. */
export class Limit implements ILimit {

    /**
     * Constructs a new Limit.
     * @param [p] Properties to set
     */
    constructor(p?: ILimit);

    /** Limit duration. */
    public duration: number;

    /** Limit data. */
    public data: number;

    /**
     * Encodes the specified Limit message. Does not implicitly {@link Limit.verify|verify} messages.
     * @param m Limit message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: ILimit, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Limit message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Limit
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Limit;

    /**
     * Creates a Limit message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Limit
     */
    public static fromObject(d: { [k: string]: any }): Limit;

    /**
     * Creates a plain object from a Limit message. Also converts values to other types if specified.
     * @param m Limit
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Limit, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Limit to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Status enum. */
export enum Status {
    OK = 100,
    RESERVATION_REFUSED = 200,
    RESOURCE_LIMIT_EXCEEDED = 201,
    PERMISSION_DENIED = 202,
    CONNECTION_FAILED = 203,
    NO_RESERVATION = 204,
    MALFORMED_MESSAGE = 400,
    UNEXPECTED_MESSAGE = 401
}

/** Represents a ReservationVoucher. */
export class ReservationVoucher implements IReservationVoucher {

    /**
     * Constructs a new ReservationVoucher.
     * @param [p] Properties to set
     */
    constructor(p?: IReservationVoucher);

    /** ReservationVoucher relay. */
    public relay: Uint8Array;

    /** ReservationVoucher peer. */
    public peer: Uint8Array;

    /** ReservationVoucher expiration. */
    public expiration: number;

    /**
     * Encodes the specified ReservationVoucher message. Does not implicitly {@link ReservationVoucher.verify|verify} messages.
     * @param m ReservationVoucher message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IReservationVoucher, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ReservationVoucher message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns ReservationVoucher
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): ReservationVoucher;

    /**
     * Creates a ReservationVoucher message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns ReservationVoucher
     */
    public static fromObject(d: { [k: string]: any }): ReservationVoucher;

    /**
     * Creates a plain object from a ReservationVoucher message. Also converts values to other types if specified.
     * @param m ReservationVoucher
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: ReservationVoucher, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ReservationVoucher to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

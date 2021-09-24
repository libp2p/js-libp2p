import * as $protobuf from "protobufjs";
/** Properties of a CircuitRelay. */
export interface ICircuitRelay {

    /** CircuitRelay type */
    type?: (CircuitRelay.Type|null);

    /** CircuitRelay srcPeer */
    srcPeer?: (CircuitRelay.IPeer|null);

    /** CircuitRelay dstPeer */
    dstPeer?: (CircuitRelay.IPeer|null);

    /** CircuitRelay code */
    code?: (CircuitRelay.Status|null);
}

/** Represents a CircuitRelay. */
export class CircuitRelay implements ICircuitRelay {

    /**
     * Constructs a new CircuitRelay.
     * @param [p] Properties to set
     */
    constructor(p?: ICircuitRelay);

    /** CircuitRelay type. */
    public type: CircuitRelay.Type;

    /** CircuitRelay srcPeer. */
    public srcPeer?: (CircuitRelay.IPeer|null);

    /** CircuitRelay dstPeer. */
    public dstPeer?: (CircuitRelay.IPeer|null);

    /** CircuitRelay code. */
    public code: CircuitRelay.Status;

    /**
     * Encodes the specified CircuitRelay message. Does not implicitly {@link CircuitRelay.verify|verify} messages.
     * @param m CircuitRelay message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: ICircuitRelay, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CircuitRelay message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns CircuitRelay
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): CircuitRelay;

    /**
     * Creates a CircuitRelay message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns CircuitRelay
     */
    public static fromObject(d: { [k: string]: any }): CircuitRelay;

    /**
     * Creates a plain object from a CircuitRelay message. Also converts values to other types if specified.
     * @param m CircuitRelay
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: CircuitRelay, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CircuitRelay to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace CircuitRelay {

    /** Status enum. */
    enum Status {
        SUCCESS = 100,
        HOP_SRC_ADDR_TOO_LONG = 220,
        HOP_DST_ADDR_TOO_LONG = 221,
        HOP_SRC_MULTIADDR_INVALID = 250,
        HOP_DST_MULTIADDR_INVALID = 251,
        HOP_NO_CONN_TO_DST = 260,
        HOP_CANT_DIAL_DST = 261,
        HOP_CANT_OPEN_DST_STREAM = 262,
        HOP_CANT_SPEAK_RELAY = 270,
        HOP_CANT_RELAY_TO_SELF = 280,
        STOP_SRC_ADDR_TOO_LONG = 320,
        STOP_DST_ADDR_TOO_LONG = 321,
        STOP_SRC_MULTIADDR_INVALID = 350,
        STOP_DST_MULTIADDR_INVALID = 351,
        STOP_RELAY_REFUSED = 390,
        MALFORMED_MESSAGE = 400
    }

    /** Type enum. */
    enum Type {
        HOP = 1,
        STOP = 2,
        STATUS = 3,
        CAN_HOP = 4
    }

    /** Properties of a Peer. */
    interface IPeer {

        /** Peer id */
        id: Uint8Array;

        /** Peer addrs */
        addrs?: (Uint8Array[]|null);
    }

    /** Represents a Peer. */
    class Peer implements IPeer {

        /**
         * Constructs a new Peer.
         * @param [p] Properties to set
         */
        constructor(p?: CircuitRelay.IPeer);

        /** Peer id. */
        public id: Uint8Array;

        /** Peer addrs. */
        public addrs: Uint8Array[];

        /**
         * Encodes the specified Peer message. Does not implicitly {@link CircuitRelay.Peer.verify|verify} messages.
         * @param m Peer message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: CircuitRelay.IPeer, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): CircuitRelay.Peer;

        /**
         * Creates a Peer message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns Peer
         */
        public static fromObject(d: { [k: string]: any }): CircuitRelay.Peer;

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @param m Peer
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: CircuitRelay.Peer, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Peer to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}

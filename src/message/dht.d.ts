import * as $protobuf from "protobufjs";
/** Properties of a Record. */
export interface IRecord {

    /** Record key */
    key?: (Uint8Array|null);

    /** Record value */
    value?: (Uint8Array|null);

    /** Record author */
    author?: (Uint8Array|null);

    /** Record signature */
    signature?: (Uint8Array|null);

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
    public key?: (Uint8Array|null);

    /** Record value. */
    public value?: (Uint8Array|null);

    /** Record author. */
    public author?: (Uint8Array|null);

    /** Record signature. */
    public signature?: (Uint8Array|null);

    /** Record timeReceived. */
    public timeReceived?: (string|null);

    /** Record _key. */
    public _key?: "key";

    /** Record _value. */
    public _value?: "value";

    /** Record _author. */
    public _author?: "author";

    /** Record _signature. */
    public _signature?: "signature";

    /** Record _timeReceived. */
    public _timeReceived?: "timeReceived";

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

/** Properties of a Message. */
export interface IMessage {

    /** Message type */
    type?: (Message.MessageType|null);

    /** Message clusterLevelRaw */
    clusterLevelRaw?: (number|null);

    /** Message key */
    key?: (Uint8Array|null);

    /** Message record */
    record?: (Uint8Array|null);

    /** Message closerPeers */
    closerPeers?: (Message.IPeer[]|null);

    /** Message providerPeers */
    providerPeers?: (Message.IPeer[]|null);
}

/** Represents a Message. */
export class Message implements IMessage {

    /**
     * Constructs a new Message.
     * @param [p] Properties to set
     */
    constructor(p?: IMessage);

    /** Message type. */
    public type?: (Message.MessageType|null);

    /** Message clusterLevelRaw. */
    public clusterLevelRaw?: (number|null);

    /** Message key. */
    public key?: (Uint8Array|null);

    /** Message record. */
    public record?: (Uint8Array|null);

    /** Message closerPeers. */
    public closerPeers: Message.IPeer[];

    /** Message providerPeers. */
    public providerPeers: Message.IPeer[];

    /** Message _type. */
    public _type?: "type";

    /** Message _clusterLevelRaw. */
    public _clusterLevelRaw?: "clusterLevelRaw";

    /** Message _key. */
    public _key?: "key";

    /** Message _record. */
    public _record?: "record";

    /**
     * Encodes the specified Message message. Does not implicitly {@link Message.verify|verify} messages.
     * @param m Message message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IMessage, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Message message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns Message
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Message;

    /**
     * Creates a Message message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns Message
     */
    public static fromObject(d: { [k: string]: any }): Message;

    /**
     * Creates a plain object from a Message message. Also converts values to other types if specified.
     * @param m Message
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: Message, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Message to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace Message {

    /** MessageType enum. */
    enum MessageType {
        PUT_VALUE = 0,
        GET_VALUE = 1,
        ADD_PROVIDER = 2,
        GET_PROVIDERS = 3,
        FIND_NODE = 4,
        PING = 5
    }

    /** ConnectionType enum. */
    enum ConnectionType {
        NOT_CONNECTED = 0,
        CONNECTED = 1,
        CAN_CONNECT = 2,
        CANNOT_CONNECT = 3
    }

    /** Properties of a Peer. */
    interface IPeer {

        /** Peer id */
        id?: (Uint8Array|null);

        /** Peer addrs */
        addrs?: (Uint8Array[]|null);

        /** Peer connection */
        connection?: (Message.ConnectionType|null);
    }

    /** Represents a Peer. */
    class Peer implements IPeer {

        /**
         * Constructs a new Peer.
         * @param [p] Properties to set
         */
        constructor(p?: Message.IPeer);

        /** Peer id. */
        public id?: (Uint8Array|null);

        /** Peer addrs. */
        public addrs: Uint8Array[];

        /** Peer connection. */
        public connection?: (Message.ConnectionType|null);

        /** Peer _id. */
        public _id?: "id";

        /** Peer _connection. */
        public _connection?: "connection";

        /**
         * Encodes the specified Peer message. Does not implicitly {@link Message.Peer.verify|verify} messages.
         * @param m Peer message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: Message.IPeer, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): Message.Peer;

        /**
         * Creates a Peer message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns Peer
         */
        public static fromObject(d: { [k: string]: any }): Message.Peer;

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @param m Peer
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: Message.Peer, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Peer to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}

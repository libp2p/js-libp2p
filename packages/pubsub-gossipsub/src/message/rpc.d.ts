import * as $protobuf from "protobufjs";
/** Properties of a RPC. */
export interface IRPC {

    /** RPC subscriptions */
    subscriptions?: (RPC.ISubOpts[]|null);

    /** RPC messages */
    messages?: (RPC.IMessage[]|null);

    /** RPC control */
    control?: (RPC.IControlMessage|null);
}

/** Represents a RPC. */
export class RPC implements IRPC {

    /**
     * Constructs a new RPC.
     * @param [p] Properties to set
     */
    constructor(p?: IRPC);

    /** RPC subscriptions. */
    public subscriptions: RPC.ISubOpts[];

    /** RPC messages. */
    public messages: RPC.IMessage[];

    /** RPC control. */
    public control?: (RPC.IControlMessage|null);

    /** RPC _control. */
    public _control?: "control";

    /**
     * Encodes the specified RPC message. Does not implicitly {@link RPC.verify|verify} messages.
     * @param m RPC message or plain object to encode
     * @param [w] Writer to encode to
     * @returns Writer
     */
    public static encode(m: IRPC, w?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RPC message from the specified reader or buffer.
     * @param r Reader or buffer to decode from
     * @param [l] Message length if known beforehand
     * @returns RPC
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC;

    /**
     * Creates a RPC message from a plain object. Also converts values to their respective internal types.
     * @param d Plain object
     * @returns RPC
     */
    public static fromObject(d: { [k: string]: any }): RPC;

    /**
     * Creates a plain object from a RPC message. Also converts values to other types if specified.
     * @param m RPC
     * @param [o] Conversion options
     * @returns Plain object
     */
    public static toObject(m: RPC, o?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RPC to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace RPC {

    /** Properties of a SubOpts. */
    interface ISubOpts {

        /** SubOpts subscribe */
        subscribe?: (boolean|null);

        /** SubOpts topic */
        topic?: (string|null);
    }

    /** Represents a SubOpts. */
    class SubOpts implements ISubOpts {

        /**
         * Constructs a new SubOpts.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.ISubOpts);

        /** SubOpts subscribe. */
        public subscribe?: (boolean|null);

        /** SubOpts topic. */
        public topic?: (string|null);

        /** SubOpts _subscribe. */
        public _subscribe?: "subscribe";

        /** SubOpts _topic. */
        public _topic?: "topic";

        /**
         * Encodes the specified SubOpts message. Does not implicitly {@link RPC.SubOpts.verify|verify} messages.
         * @param m SubOpts message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.ISubOpts, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SubOpts message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns SubOpts
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.SubOpts;

        /**
         * Creates a SubOpts message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns SubOpts
         */
        public static fromObject(d: { [k: string]: any }): RPC.SubOpts;

        /**
         * Creates a plain object from a SubOpts message. Also converts values to other types if specified.
         * @param m SubOpts
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.SubOpts, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SubOpts to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a Message. */
    interface IMessage {

        /** Message from */
        from?: (Uint8Array|null);

        /** Message data */
        data?: (Uint8Array|null);

        /** Message seqno */
        seqno?: (Uint8Array|null);

        /** Message topic */
        topic: string;

        /** Message signature */
        signature?: (Uint8Array|null);

        /** Message key */
        key?: (Uint8Array|null);
    }

    /** Represents a Message. */
    class Message implements IMessage {

        /**
         * Constructs a new Message.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IMessage);

        /** Message from. */
        public from?: (Uint8Array|null);

        /** Message data. */
        public data?: (Uint8Array|null);

        /** Message seqno. */
        public seqno?: (Uint8Array|null);

        /** Message topic. */
        public topic: string;

        /** Message signature. */
        public signature?: (Uint8Array|null);

        /** Message key. */
        public key?: (Uint8Array|null);

        /** Message _from. */
        public _from?: "from";

        /** Message _data. */
        public _data?: "data";

        /** Message _seqno. */
        public _seqno?: "seqno";

        /** Message _signature. */
        public _signature?: "signature";

        /** Message _key. */
        public _key?: "key";

        /**
         * Encodes the specified Message message. Does not implicitly {@link RPC.Message.verify|verify} messages.
         * @param m Message message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.Message;

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns Message
         */
        public static fromObject(d: { [k: string]: any }): RPC.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param m Message
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.Message, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ControlMessage. */
    interface IControlMessage {

        /** ControlMessage ihave */
        ihave?: (RPC.IControlIHave[]|null);

        /** ControlMessage iwant */
        iwant?: (RPC.IControlIWant[]|null);

        /** ControlMessage graft */
        graft?: (RPC.IControlGraft[]|null);

        /** ControlMessage prune */
        prune?: (RPC.IControlPrune[]|null);
    }

    /** Represents a ControlMessage. */
    class ControlMessage implements IControlMessage {

        /**
         * Constructs a new ControlMessage.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IControlMessage);

        /** ControlMessage ihave. */
        public ihave: RPC.IControlIHave[];

        /** ControlMessage iwant. */
        public iwant: RPC.IControlIWant[];

        /** ControlMessage graft. */
        public graft: RPC.IControlGraft[];

        /** ControlMessage prune. */
        public prune: RPC.IControlPrune[];

        /**
         * Encodes the specified ControlMessage message. Does not implicitly {@link RPC.ControlMessage.verify|verify} messages.
         * @param m ControlMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IControlMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ControlMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ControlMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.ControlMessage;

        /**
         * Creates a ControlMessage message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns ControlMessage
         */
        public static fromObject(d: { [k: string]: any }): RPC.ControlMessage;

        /**
         * Creates a plain object from a ControlMessage message. Also converts values to other types if specified.
         * @param m ControlMessage
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.ControlMessage, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ControlMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ControlIHave. */
    interface IControlIHave {

        /** ControlIHave topicID */
        topicID?: (string|null);

        /** ControlIHave messageIDs */
        messageIDs?: (Uint8Array[]|null);
    }

    /** Represents a ControlIHave. */
    class ControlIHave implements IControlIHave {

        /**
         * Constructs a new ControlIHave.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IControlIHave);

        /** ControlIHave topicID. */
        public topicID?: (string|null);

        /** ControlIHave messageIDs. */
        public messageIDs: Uint8Array[];

        /** ControlIHave _topicID. */
        public _topicID?: "topicID";

        /**
         * Encodes the specified ControlIHave message. Does not implicitly {@link RPC.ControlIHave.verify|verify} messages.
         * @param m ControlIHave message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IControlIHave, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ControlIHave message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ControlIHave
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.ControlIHave;

        /**
         * Creates a ControlIHave message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns ControlIHave
         */
        public static fromObject(d: { [k: string]: any }): RPC.ControlIHave;

        /**
         * Creates a plain object from a ControlIHave message. Also converts values to other types if specified.
         * @param m ControlIHave
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.ControlIHave, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ControlIHave to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ControlIWant. */
    interface IControlIWant {

        /** ControlIWant messageIDs */
        messageIDs?: (Uint8Array[]|null);
    }

    /** Represents a ControlIWant. */
    class ControlIWant implements IControlIWant {

        /**
         * Constructs a new ControlIWant.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IControlIWant);

        /** ControlIWant messageIDs. */
        public messageIDs: Uint8Array[];

        /**
         * Encodes the specified ControlIWant message. Does not implicitly {@link RPC.ControlIWant.verify|verify} messages.
         * @param m ControlIWant message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IControlIWant, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ControlIWant message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ControlIWant
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.ControlIWant;

        /**
         * Creates a ControlIWant message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns ControlIWant
         */
        public static fromObject(d: { [k: string]: any }): RPC.ControlIWant;

        /**
         * Creates a plain object from a ControlIWant message. Also converts values to other types if specified.
         * @param m ControlIWant
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.ControlIWant, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ControlIWant to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ControlGraft. */
    interface IControlGraft {

        /** ControlGraft topicID */
        topicID?: (string|null);
    }

    /** Represents a ControlGraft. */
    class ControlGraft implements IControlGraft {

        /**
         * Constructs a new ControlGraft.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IControlGraft);

        /** ControlGraft topicID. */
        public topicID?: (string|null);

        /** ControlGraft _topicID. */
        public _topicID?: "topicID";

        /**
         * Encodes the specified ControlGraft message. Does not implicitly {@link RPC.ControlGraft.verify|verify} messages.
         * @param m ControlGraft message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IControlGraft, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ControlGraft message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ControlGraft
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.ControlGraft;

        /**
         * Creates a ControlGraft message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns ControlGraft
         */
        public static fromObject(d: { [k: string]: any }): RPC.ControlGraft;

        /**
         * Creates a plain object from a ControlGraft message. Also converts values to other types if specified.
         * @param m ControlGraft
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.ControlGraft, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ControlGraft to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ControlPrune. */
    interface IControlPrune {

        /** ControlPrune topicID */
        topicID?: (string|null);

        /** ControlPrune peers */
        peers?: (RPC.IPeerInfo[]|null);

        /** ControlPrune backoff */
        backoff?: (number|null);
    }

    /** Represents a ControlPrune. */
    class ControlPrune implements IControlPrune {

        /**
         * Constructs a new ControlPrune.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IControlPrune);

        /** ControlPrune topicID. */
        public topicID?: (string|null);

        /** ControlPrune peers. */
        public peers: RPC.IPeerInfo[];

        /** ControlPrune backoff. */
        public backoff?: (number|null);

        /** ControlPrune _topicID. */
        public _topicID?: "topicID";

        /** ControlPrune _backoff. */
        public _backoff?: "backoff";

        /**
         * Encodes the specified ControlPrune message. Does not implicitly {@link RPC.ControlPrune.verify|verify} messages.
         * @param m ControlPrune message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IControlPrune, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ControlPrune message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ControlPrune
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.ControlPrune;

        /**
         * Creates a ControlPrune message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns ControlPrune
         */
        public static fromObject(d: { [k: string]: any }): RPC.ControlPrune;

        /**
         * Creates a plain object from a ControlPrune message. Also converts values to other types if specified.
         * @param m ControlPrune
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.ControlPrune, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ControlPrune to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a PeerInfo. */
    interface IPeerInfo {

        /** PeerInfo peerID */
        peerID?: (Uint8Array|null);

        /** PeerInfo signedPeerRecord */
        signedPeerRecord?: (Uint8Array|null);
    }

    /** Represents a PeerInfo. */
    class PeerInfo implements IPeerInfo {

        /**
         * Constructs a new PeerInfo.
         * @param [p] Properties to set
         */
        constructor(p?: RPC.IPeerInfo);

        /** PeerInfo peerID. */
        public peerID?: (Uint8Array|null);

        /** PeerInfo signedPeerRecord. */
        public signedPeerRecord?: (Uint8Array|null);

        /** PeerInfo _peerID. */
        public _peerID?: "peerID";

        /** PeerInfo _signedPeerRecord. */
        public _signedPeerRecord?: "signedPeerRecord";

        /**
         * Encodes the specified PeerInfo message. Does not implicitly {@link RPC.PeerInfo.verify|verify} messages.
         * @param m PeerInfo message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: RPC.IPeerInfo, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PeerInfo message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns PeerInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): RPC.PeerInfo;

        /**
         * Creates a PeerInfo message from a plain object. Also converts values to their respective internal types.
         * @param d Plain object
         * @returns PeerInfo
         */
        public static fromObject(d: { [k: string]: any }): RPC.PeerInfo;

        /**
         * Creates a plain object from a PeerInfo message. Also converts values to other types if specified.
         * @param m PeerInfo
         * @param [o] Conversion options
         * @returns Plain object
         */
        public static toObject(m: RPC.PeerInfo, o?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PeerInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}

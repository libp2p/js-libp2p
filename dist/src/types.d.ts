export declare enum KeyType {
    RSA = 0,
    Ed25519 = 1,
    Secp256k1 = 2,
    ECDSA = 3
}
export interface MessageProto<T> {
    encode(value: T): Uint8Array;
    decode(bytes: Uint8Array): T;
}
export declare type SUCCESS = 100;
export declare type HOP_SRC_ADDR_TOO_LONG = 220;
export declare type HOP_DST_ADDR_TOO_LONG = 221;
export declare type HOP_SRC_MULTIADDR_INVALID = 250;
export declare type HOP_DST_MULTIADDR_INVALID = 251;
export declare type HOP_NO_CONN_TO_DST = 260;
export declare type HOP_CANT_DIAL_DST = 261;
export declare type HOP_CANT_OPEN_DST_STREAM = 262;
export declare type HOP_CANT_SPEAK_RELAY = 270;
export declare type HOP_CANT_RELAY_TO_SELF = 280;
export declare type STOP_SRC_ADDR_TOO_LONG = 320;
export declare type STOP_DST_ADDR_TOO_LONG = 321;
export declare type STOP_SRC_MULTIADDR_INVALID = 350;
export declare type STOP_DST_MULTIADDR_INVALID = 351;
export declare type STOP_RELAY_REFUSED = 390;
export declare type MALFORMED_MESSAGE = 400;
export declare type CircuitStatus = SUCCESS | HOP_SRC_ADDR_TOO_LONG | HOP_DST_ADDR_TOO_LONG | HOP_SRC_MULTIADDR_INVALID | HOP_DST_MULTIADDR_INVALID | HOP_NO_CONN_TO_DST | HOP_CANT_DIAL_DST | HOP_CANT_OPEN_DST_STREAM | HOP_CANT_SPEAK_RELAY | HOP_CANT_RELAY_TO_SELF | STOP_SRC_ADDR_TOO_LONG | STOP_DST_ADDR_TOO_LONG | STOP_SRC_MULTIADDR_INVALID | STOP_DST_MULTIADDR_INVALID | STOP_RELAY_REFUSED | MALFORMED_MESSAGE;
export declare type HOP = 1;
export declare type STOP = 2;
export declare type STATUS = 3;
export declare type CAN_HOP = 4;
export declare type CircuitType = HOP | STOP | STATUS | CAN_HOP;
export declare type CircuitPeer = {
    id: Uint8Array;
    addrs: Uint8Array[];
};
export declare type CircuitRequest = {
    type: CircuitType;
    code?: CircuitStatus;
    dstPeer: CircuitPeer;
    srcPeer: CircuitPeer;
};
export declare type CircuitMessage = {
    type?: CircuitType;
    dstPeer?: CircuitPeer;
    srcPeer?: CircuitPeer;
    code?: CircuitStatus;
};
export interface CircuitMessageProto extends MessageProto<CircuitMessage> {
    Status: {
        SUCCESS: SUCCESS;
        HOP_SRC_ADDR_TOO_LONG: HOP_SRC_ADDR_TOO_LONG;
        HOP_DST_ADDR_TOO_LONG: HOP_DST_ADDR_TOO_LONG;
        HOP_SRC_MULTIADDR_INVALID: HOP_SRC_MULTIADDR_INVALID;
        HOP_DST_MULTIADDR_INVALID: HOP_DST_MULTIADDR_INVALID;
        HOP_NO_CONN_TO_DST: HOP_NO_CONN_TO_DST;
        HOP_CANT_DIAL_DST: HOP_CANT_DIAL_DST;
        HOP_CANT_OPEN_DST_STREAM: HOP_CANT_OPEN_DST_STREAM;
        HOP_CANT_SPEAK_RELAY: HOP_CANT_SPEAK_RELAY;
        HOP_CANT_RELAY_TO_SELF: HOP_CANT_RELAY_TO_SELF;
        STOP_SRC_ADDR_TOO_LONG: STOP_SRC_ADDR_TOO_LONG;
        STOP_DST_ADDR_TOO_LONG: STOP_DST_ADDR_TOO_LONG;
        STOP_SRC_MULTIADDR_INVALID: STOP_SRC_MULTIADDR_INVALID;
        STOP_DST_MULTIADDR_INVALID: STOP_DST_MULTIADDR_INVALID;
        STOP_RELAY_REFUSED: STOP_RELAY_REFUSED;
        MALFORMED_MESSAGE: MALFORMED_MESSAGE;
    };
    Type: {
        HOP: HOP;
        STOP: STOP;
        STATUS: STATUS;
        CAN_HOP: CAN_HOP;
    };
}
export declare type Exchange = {
    id: Uint8Array;
    pubkey: PublicKey;
};
export declare type ExchangeProto = MessageProto<Exchange>;
export declare type PublicKey = {
    Type: KeyType;
    Data: Uint8Array;
};
export declare type PublicKeyProto = MessageProto<PublicKey>;
//# sourceMappingURL=types.d.ts.map
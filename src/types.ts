
// Insecure Message types
export enum KeyType {
  RSA = 0,
  Ed25519 = 1,
  Secp256k1 = 2,
  ECDSA = 3
}

// Protobufs
export interface MessageProto<T> {
  encode(value: T): Uint8Array
  decode(bytes: Uint8Array): T
}

export type SUCCESS = 100;
export type HOP_SRC_ADDR_TOO_LONG = 220;
export type HOP_DST_ADDR_TOO_LONG = 221;
export type HOP_SRC_MULTIADDR_INVALID = 250;
export type HOP_DST_MULTIADDR_INVALID = 251;
export type HOP_NO_CONN_TO_DST = 260;
export type HOP_CANT_DIAL_DST = 261;
export type HOP_CANT_OPEN_DST_STREAM = 262;
export type HOP_CANT_SPEAK_RELAY = 270;
export type HOP_CANT_RELAY_TO_SELF = 280;
export type STOP_SRC_ADDR_TOO_LONG = 320;
export type STOP_DST_ADDR_TOO_LONG = 321;
export type STOP_SRC_MULTIADDR_INVALID = 350;
export type STOP_DST_MULTIADDR_INVALID = 351;
export type STOP_RELAY_REFUSED = 390;
export type MALFORMED_MESSAGE = 400;

export type CircuitStatus = SUCCESS | HOP_SRC_ADDR_TOO_LONG | HOP_DST_ADDR_TOO_LONG
  | HOP_SRC_MULTIADDR_INVALID | HOP_DST_MULTIADDR_INVALID | HOP_NO_CONN_TO_DST
  | HOP_CANT_DIAL_DST | HOP_CANT_OPEN_DST_STREAM | HOP_CANT_SPEAK_RELAY | HOP_CANT_RELAY_TO_SELF
  | STOP_SRC_ADDR_TOO_LONG | STOP_DST_ADDR_TOO_LONG | STOP_SRC_MULTIADDR_INVALID
  | STOP_DST_MULTIADDR_INVALID | STOP_RELAY_REFUSED | MALFORMED_MESSAGE

export type HOP = 1;
export type STOP = 2;
export type STATUS = 3;
export type CAN_HOP = 4;

export type CircuitType = HOP | STOP | STATUS | CAN_HOP

export type CircuitPeer = {
  id: Uint8Array
  addrs: Uint8Array[]
}

export type CircuitRequest = {
  type: CircuitType
  code?: CircuitStatus
  dstPeer: CircuitPeer
  srcPeer: CircuitPeer
}

export type CircuitMessage = {
  type?: CircuitType
  dstPeer?: CircuitPeer
  srcPeer?: CircuitPeer
  code?: CircuitStatus
}

export interface CircuitMessageProto extends MessageProto<CircuitMessage> {
  Status: {
    SUCCESS: SUCCESS,
    HOP_SRC_ADDR_TOO_LONG: HOP_SRC_ADDR_TOO_LONG,
    HOP_DST_ADDR_TOO_LONG: HOP_DST_ADDR_TOO_LONG,
    HOP_SRC_MULTIADDR_INVALID: HOP_SRC_MULTIADDR_INVALID,
    HOP_DST_MULTIADDR_INVALID: HOP_DST_MULTIADDR_INVALID,
    HOP_NO_CONN_TO_DST: HOP_NO_CONN_TO_DST,
    HOP_CANT_DIAL_DST: HOP_CANT_DIAL_DST,
    HOP_CANT_OPEN_DST_STREAM: HOP_CANT_OPEN_DST_STREAM,
    HOP_CANT_SPEAK_RELAY: HOP_CANT_SPEAK_RELAY,
    HOP_CANT_RELAY_TO_SELF: HOP_CANT_RELAY_TO_SELF,
    STOP_SRC_ADDR_TOO_LONG: STOP_SRC_ADDR_TOO_LONG,
    STOP_DST_ADDR_TOO_LONG: STOP_DST_ADDR_TOO_LONG,
    STOP_SRC_MULTIADDR_INVALID: STOP_SRC_MULTIADDR_INVALID,
    STOP_DST_MULTIADDR_INVALID: STOP_DST_MULTIADDR_INVALID,
    STOP_RELAY_REFUSED: STOP_RELAY_REFUSED,
    MALFORMED_MESSAGE: MALFORMED_MESSAGE
  }
  Type: {
    HOP: HOP,
    STOP: STOP,
    STATUS: STATUS,
    CAN_HOP: CAN_HOP
  }
}


export type Exchange = {
  id: Uint8Array
  pubkey: PublicKey
}
export type ExchangeProto = MessageProto<Exchange>

export type PublicKey = {
  Type: KeyType,
  Data: Uint8Array
}

export type PublicKeyProto = MessageProto<PublicKey>

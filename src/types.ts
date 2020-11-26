
// Insecure Message types
export enum KeyType {
  RSA = 0,
  Ed25519 = 1,
  Secp256k1 = 2,
  ECDSA = 3
}

export type MessagePublicKey = {
  Type: KeyType
  Data: Uint8Array
}

export type MessageExchange = {
  id: Uint8Array
  pubKey: MessagePublicKey
}

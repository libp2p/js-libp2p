/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes, enumeration } from 'protons-runtime'

export interface Exchange {
  id?: Uint8Array
  pubkey?: PublicKey
}

export namespace Exchange {
  export const codec = () => {
    return message<Exchange>({
      1: { name: 'id', codec: bytes, optional: true },
      2: { name: 'pubkey', codec: PublicKey.codec(), optional: true }
    })
  }

  export const encode = (obj: Exchange): Uint8Array => {
    return encodeMessage(obj, Exchange.codec())
  }

  export const decode = (buf: Uint8Array): Exchange => {
    return decodeMessage(buf, Exchange.codec())
  }
}

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  Secp256k1 = 'Secp256k1',
  ECDSA = 'ECDSA'
}

export namespace KeyType {
  export const codec = () => {
    return enumeration<typeof KeyType>(KeyType)
  }
}

export interface PublicKey {
  Type: KeyType
  Data: Uint8Array
}

export namespace PublicKey {
  export const codec = () => {
    return message<PublicKey>({
      1: { name: 'Type', codec: KeyType.codec() },
      2: { name: 'Data', codec: bytes }
    })
  }

  export const encode = (obj: PublicKey): Uint8Array => {
    return encodeMessage(obj, PublicKey.codec())
  }

  export const decode = (buf: Uint8Array): PublicKey => {
    return decodeMessage(buf, PublicKey.codec())
  }
}

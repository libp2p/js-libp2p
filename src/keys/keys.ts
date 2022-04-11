/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message, bytes } from 'protons-runtime'

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  Secp256k1 = 'Secp256k1'
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

export interface PrivateKey {
  Type: KeyType
  Data: Uint8Array
}

export namespace PrivateKey {
  export const codec = () => {
    return message<PrivateKey>({
      1: { name: 'Type', codec: KeyType.codec() },
      2: { name: 'Data', codec: bytes }
    })
  }

  export const encode = (obj: PrivateKey): Uint8Array => {
    return encodeMessage(obj, PrivateKey.codec())
  }

  export const decode = (buf: Uint8Array): PrivateKey => {
    return decodeMessage(buf, PrivateKey.codec())
  }
}

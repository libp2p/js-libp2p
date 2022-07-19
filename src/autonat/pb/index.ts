/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message, bytes, string } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface Message {
  type?: Message.MessageType
  dial?: Message.Dial
  dialResponse?: Message.DialResponse
}

export namespace Message {
  export enum MessageType {
    DIAL = 'DIAL',
    DIAL_RESPONSE = 'DIAL_RESPONSE'
  }

  enum __MessageTypeValues {
    DIAL = 0,
    DIAL_RESPONSE = 1
  }

  export namespace MessageType {
    export const codec = () => {
      return enumeration<typeof MessageType>(__MessageTypeValues)
    }
  }

  export enum ResponseStatus {
    OK = 'OK',
    E_DIAL_ERROR = 'E_DIAL_ERROR',
    E_DIAL_REFUSED = 'E_DIAL_REFUSED',
    E_BAD_REQUEST = 'E_BAD_REQUEST',
    E_INTERNAL_ERROR = 'E_INTERNAL_ERROR'
  }

  enum __ResponseStatusValues {
    OK = 0,
    E_DIAL_ERROR = 100,
    E_DIAL_REFUSED = 101,
    E_BAD_REQUEST = 200,
    E_INTERNAL_ERROR = 300
  }

  export namespace ResponseStatus {
    export const codec = () => {
      return enumeration<typeof ResponseStatus>(__ResponseStatusValues)
    }
  }

  export interface PeerInfo {
    id?: Uint8Array
    addrs: Uint8Array[]
  }

  export namespace PeerInfo {
    export const codec = (): Codec<PeerInfo> => {
      return message<PeerInfo>({
        1: { name: 'id', codec: bytes, optional: true },
        2: { name: 'addrs', codec: bytes, repeats: true }
      })
    }

    export const encode = (obj: PeerInfo): Uint8Array => {
      return encodeMessage(obj, PeerInfo.codec())
    }

    export const decode = (buf: Uint8Array): PeerInfo => {
      return decodeMessage(buf, PeerInfo.codec())
    }
  }

  export interface Dial {
    peer?: Message.PeerInfo
  }

  export namespace Dial {
    export const codec = (): Codec<Dial> => {
      return message<Dial>({
        1: { name: 'peer', codec: Message.PeerInfo.codec(), optional: true }
      })
    }

    export const encode = (obj: Dial): Uint8Array => {
      return encodeMessage(obj, Dial.codec())
    }

    export const decode = (buf: Uint8Array): Dial => {
      return decodeMessage(buf, Dial.codec())
    }
  }

  export interface DialResponse {
    status?: Message.ResponseStatus
    statusText?: string
    addr?: Uint8Array
  }

  export namespace DialResponse {
    export const codec = (): Codec<DialResponse> => {
      return message<DialResponse>({
        1: { name: 'status', codec: Message.ResponseStatus.codec(), optional: true },
        2: { name: 'statusText', codec: string, optional: true },
        3: { name: 'addr', codec: bytes, optional: true }
      })
    }

    export const encode = (obj: DialResponse): Uint8Array => {
      return encodeMessage(obj, DialResponse.codec())
    }

    export const decode = (buf: Uint8Array): DialResponse => {
      return decodeMessage(buf, DialResponse.codec())
    }
  }

  export const codec = (): Codec<Message> => {
    return message<Message>({
      1: { name: 'type', codec: Message.MessageType.codec(), optional: true },
      2: { name: 'dial', codec: Message.Dial.codec(), optional: true },
      3: { name: 'dialResponse', codec: Message.DialResponse.codec(), optional: true }
    })
  }

  export const encode = (obj: Message): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array): Message => {
    return decodeMessage(buf, Message.codec())
  }
}

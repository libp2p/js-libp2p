declare module 'stun' {
  import type { Socket } from 'node:dgram'

  export interface StunAttribute {
    type: number
    value: any
  }

  export interface StunMessageAttributes {
    USERNAME?: string
    MESSAGE_INTEGRITY?: Buffer
    FINGERPRINT?: number
    XOR_MAPPED_ADDRESS?: {
      family: string
      port: number
      address: string
    }
    [key: string]: any
  }

  export interface StunMessage {
    type: number
    transactionId: Buffer
    attributes?: StunMessageAttributes
    addAttribute(type: number, value: any): void
  }

  export interface StunRequest extends StunMessage {}
  export interface StunResponse extends StunMessage {}

  export interface StunServer {
    on(event: 'bindingRequest', listener: (request: StunRequest, remote: any) => void): this
    on(event: 'bindingIndication', listener: (message: StunMessage, remote: any) => void): this
    on(event: 'bindingResponse', listener: (response: StunResponse, remote: any) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    close(): void
  }

  export const constants: {
    STUN_BINDING_REQUEST: number
    STUN_BINDING_RESPONSE: number
    STUN_BINDING_INDICATION: number
    STUN_ATTR_USERNAME: number
    STUN_ATTR_MESSAGE_INTEGRITY: number
    STUN_ATTR_FINGERPRINT: number
    STUN_ATTR_XOR_MAPPED_ADDRESS: number
    STUN_ATTR_MAPPED_ADDRESS: number
    [key: string]: number
  }

  export function isStunMessage(buf: Buffer): boolean
  export function decode(buf: Buffer): StunMessage
  export function encode(message: StunMessage): Buffer
  export function createMessage(type: number, transactionId?: Buffer): StunMessage
  export function createServer(socket?: Socket): StunServer
  export function createTransaction(options: any, cb: (err: Error | null, res?: StunResponse) => void): void
  export function request(url: string, options: any, cb: (err: Error | null, res?: StunResponse) => void): void
  export function validateFingerprint(message: StunMessage): boolean
  export function validateMessageIntegrity(message: StunMessage, key: Buffer): boolean

  export class StunError extends Error {}
  export class StunMessageError extends StunError {}
  export class StunResponseError extends StunError {}
}

import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

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
    export const codec = (): Codec<MessageType> => {
      return enumeration<MessageType>(__MessageTypeValues)
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
    export const codec = (): Codec<ResponseStatus> => {
      return enumeration<ResponseStatus>(__ResponseStatusValues)
    }
  }

  export interface PeerInfo {
    id?: Uint8Array
    addrs: Uint8Array[]
  }

  export namespace PeerInfo {
    let _codec: Codec<PeerInfo>

    export const codec = (): Codec<PeerInfo> => {
      if (_codec == null) {
        _codec = message<PeerInfo>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.id != null) {
            w.uint32(10)
            w.bytes(obj.id)
          }

          if (obj.addrs != null) {
            for (const value of obj.addrs) {
              w.uint32(18)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            addrs: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.id = reader.bytes()
                break
              }
              case 2: {
                if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                  throw new MaxLengthError('Decode error - map field "addrs" had too many elements')
                }

                obj.addrs.push(reader.bytes())
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<PeerInfo>): Uint8Array => {
      return encodeMessage(obj, PeerInfo.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo => {
      return decodeMessage(buf, PeerInfo.codec(), opts)
    }
  }

  export interface Dial {
    peer?: Message.PeerInfo
  }

  export namespace Dial {
    let _codec: Codec<Dial>

    export const codec = (): Codec<Dial> => {
      if (_codec == null) {
        _codec = message<Dial>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.peer != null) {
            w.uint32(10)
            Message.PeerInfo.codec().encode(obj.peer, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.peer = Message.PeerInfo.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.peer
                })
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<Dial>): Uint8Array => {
      return encodeMessage(obj, Dial.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Dial>): Dial => {
      return decodeMessage(buf, Dial.codec(), opts)
    }
  }

  export interface DialResponse {
    status?: Message.ResponseStatus
    statusText?: string
    addr?: Uint8Array
  }

  export namespace DialResponse {
    let _codec: Codec<DialResponse>

    export const codec = (): Codec<DialResponse> => {
      if (_codec == null) {
        _codec = message<DialResponse>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.status != null) {
            w.uint32(8)
            Message.ResponseStatus.codec().encode(obj.status, w)
          }

          if (obj.statusText != null) {
            w.uint32(18)
            w.string(obj.statusText)
          }

          if (obj.addr != null) {
            w.uint32(26)
            w.bytes(obj.addr)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.status = Message.ResponseStatus.codec().decode(reader)
                break
              }
              case 2: {
                obj.statusText = reader.string()
                break
              }
              case 3: {
                obj.addr = reader.bytes()
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<DialResponse>): Uint8Array => {
      return encodeMessage(obj, DialResponse.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialResponse>): DialResponse => {
      return decodeMessage(buf, DialResponse.codec(), opts)
    }
  }

  let _codec: Codec<Message>

  export const codec = (): Codec<Message> => {
    if (_codec == null) {
      _codec = message<Message>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          Message.MessageType.codec().encode(obj.type, w)
        }

        if (obj.dial != null) {
          w.uint32(18)
          Message.Dial.codec().encode(obj.dial, w)
        }

        if (obj.dialResponse != null) {
          w.uint32(26)
          Message.DialResponse.codec().encode(obj.dialResponse, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = Message.MessageType.codec().decode(reader)
              break
            }
            case 2: {
              obj.dial = Message.Dial.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.dial
              })
              break
            }
            case 3: {
              obj.dialResponse = Message.DialResponse.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.dialResponse
              })
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Message>): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message => {
    return decodeMessage(buf, Message.codec(), opts)
  }
}

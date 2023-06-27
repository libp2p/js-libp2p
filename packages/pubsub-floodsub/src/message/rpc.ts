/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface RPC {
  subscriptions: RPC.SubOpts[]
  messages: RPC.Message[]
  control?: ControlMessage
}

export namespace RPC {
  export interface SubOpts {
    subscribe?: boolean
    topic?: string
  }

  export namespace SubOpts {
    let _codec: Codec<SubOpts>

    export const codec = (): Codec<SubOpts> => {
      if (_codec == null) {
        _codec = message<SubOpts>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.subscribe != null) {
            w.uint32(8)
            w.bool(obj.subscribe)
          }

          if (obj.topic != null) {
            w.uint32(18)
            w.string(obj.topic)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.subscribe = reader.bool()
                break
              case 2:
                obj.topic = reader.string()
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<SubOpts>): Uint8Array => {
      return encodeMessage(obj, SubOpts.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): SubOpts => {
      return decodeMessage(buf, SubOpts.codec())
    }
  }

  export interface Message {
    from?: Uint8Array
    data?: Uint8Array
    sequenceNumber?: Uint8Array
    topic?: string
    signature?: Uint8Array
    key?: Uint8Array
  }

  export namespace Message {
    let _codec: Codec<Message>

    export const codec = (): Codec<Message> => {
      if (_codec == null) {
        _codec = message<Message>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.from != null) {
            w.uint32(10)
            w.bytes(obj.from)
          }

          if (obj.data != null) {
            w.uint32(18)
            w.bytes(obj.data)
          }

          if (obj.sequenceNumber != null) {
            w.uint32(26)
            w.bytes(obj.sequenceNumber)
          }

          if (obj.topic != null) {
            w.uint32(34)
            w.string(obj.topic)
          }

          if (obj.signature != null) {
            w.uint32(42)
            w.bytes(obj.signature)
          }

          if (obj.key != null) {
            w.uint32(50)
            w.bytes(obj.key)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.from = reader.bytes()
                break
              case 2:
                obj.data = reader.bytes()
                break
              case 3:
                obj.sequenceNumber = reader.bytes()
                break
              case 4:
                obj.topic = reader.string()
                break
              case 5:
                obj.signature = reader.bytes()
                break
              case 6:
                obj.key = reader.bytes()
                break
              default:
                reader.skipType(tag & 7)
                break
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

    export const decode = (buf: Uint8Array | Uint8ArrayList): Message => {
      return decodeMessage(buf, Message.codec())
    }
  }

  let _codec: Codec<RPC>

  export const codec = (): Codec<RPC> => {
    if (_codec == null) {
      _codec = message<RPC>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.subscriptions != null) {
          for (const value of obj.subscriptions) {
            w.uint32(10)
            RPC.SubOpts.codec().encode(value, w)
          }
        }

        if (obj.messages != null) {
          for (const value of obj.messages) {
            w.uint32(18)
            RPC.Message.codec().encode(value, w)
          }
        }

        if (obj.control != null) {
          w.uint32(26)
          ControlMessage.codec().encode(obj.control, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          subscriptions: [],
          messages: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.subscriptions.push(RPC.SubOpts.codec().decode(reader, reader.uint32()))
              break
            case 2:
              obj.messages.push(RPC.Message.codec().decode(reader, reader.uint32()))
              break
            case 3:
              obj.control = ControlMessage.codec().decode(reader, reader.uint32())
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<RPC>): Uint8Array => {
    return encodeMessage(obj, RPC.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): RPC => {
    return decodeMessage(buf, RPC.codec())
  }
}

export interface ControlMessage {
  ihave: ControlIHave[]
  iwant: ControlIWant[]
  graft: ControlGraft[]
  prune: ControlPrune[]
}

export namespace ControlMessage {
  let _codec: Codec<ControlMessage>

  export const codec = (): Codec<ControlMessage> => {
    if (_codec == null) {
      _codec = message<ControlMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.ihave != null) {
          for (const value of obj.ihave) {
            w.uint32(10)
            ControlIHave.codec().encode(value, w)
          }
        }

        if (obj.iwant != null) {
          for (const value of obj.iwant) {
            w.uint32(18)
            ControlIWant.codec().encode(value, w)
          }
        }

        if (obj.graft != null) {
          for (const value of obj.graft) {
            w.uint32(26)
            ControlGraft.codec().encode(value, w)
          }
        }

        if (obj.prune != null) {
          for (const value of obj.prune) {
            w.uint32(34)
            ControlPrune.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          ihave: [],
          iwant: [],
          graft: [],
          prune: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.ihave.push(ControlIHave.codec().decode(reader, reader.uint32()))
              break
            case 2:
              obj.iwant.push(ControlIWant.codec().decode(reader, reader.uint32()))
              break
            case 3:
              obj.graft.push(ControlGraft.codec().decode(reader, reader.uint32()))
              break
            case 4:
              obj.prune.push(ControlPrune.codec().decode(reader, reader.uint32()))
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ControlMessage>): Uint8Array => {
    return encodeMessage(obj, ControlMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ControlMessage => {
    return decodeMessage(buf, ControlMessage.codec())
  }
}

export interface ControlIHave {
  topic?: string
  messageIDs: Uint8Array[]
}

export namespace ControlIHave {
  let _codec: Codec<ControlIHave>

  export const codec = (): Codec<ControlIHave> => {
    if (_codec == null) {
      _codec = message<ControlIHave>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.topic != null) {
          w.uint32(10)
          w.string(obj.topic)
        }

        if (obj.messageIDs != null) {
          for (const value of obj.messageIDs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          messageIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.topic = reader.string()
              break
            case 2:
              obj.messageIDs.push(reader.bytes())
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ControlIHave>): Uint8Array => {
    return encodeMessage(obj, ControlIHave.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ControlIHave => {
    return decodeMessage(buf, ControlIHave.codec())
  }
}

export interface ControlIWant {
  messageIDs: Uint8Array[]
}

export namespace ControlIWant {
  let _codec: Codec<ControlIWant>

  export const codec = (): Codec<ControlIWant> => {
    if (_codec == null) {
      _codec = message<ControlIWant>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.messageIDs != null) {
          for (const value of obj.messageIDs) {
            w.uint32(10)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          messageIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.messageIDs.push(reader.bytes())
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ControlIWant>): Uint8Array => {
    return encodeMessage(obj, ControlIWant.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ControlIWant => {
    return decodeMessage(buf, ControlIWant.codec())
  }
}

export interface ControlGraft {
  topic?: string
}

export namespace ControlGraft {
  let _codec: Codec<ControlGraft>

  export const codec = (): Codec<ControlGraft> => {
    if (_codec == null) {
      _codec = message<ControlGraft>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.topic != null) {
          w.uint32(10)
          w.string(obj.topic)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.topic = reader.string()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ControlGraft>): Uint8Array => {
    return encodeMessage(obj, ControlGraft.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ControlGraft => {
    return decodeMessage(buf, ControlGraft.codec())
  }
}

export interface ControlPrune {
  topic?: string
  peers: PeerInfo[]
  backoff?: bigint
}

export namespace ControlPrune {
  let _codec: Codec<ControlPrune>

  export const codec = (): Codec<ControlPrune> => {
    if (_codec == null) {
      _codec = message<ControlPrune>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.topic != null) {
          w.uint32(10)
          w.string(obj.topic)
        }

        if (obj.peers != null) {
          for (const value of obj.peers) {
            w.uint32(18)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (obj.backoff != null) {
          w.uint32(24)
          w.uint64(obj.backoff)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.topic = reader.string()
              break
            case 2:
              obj.peers.push(PeerInfo.codec().decode(reader, reader.uint32()))
              break
            case 3:
              obj.backoff = reader.uint64()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ControlPrune>): Uint8Array => {
    return encodeMessage(obj, ControlPrune.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ControlPrune => {
    return decodeMessage(buf, ControlPrune.codec())
  }
}

export interface PeerInfo {
  peerID?: Uint8Array
  signedPeerRecord?: Uint8Array
}

export namespace PeerInfo {
  let _codec: Codec<PeerInfo>

  export const codec = (): Codec<PeerInfo> => {
    if (_codec == null) {
      _codec = message<PeerInfo>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.peerID != null) {
          w.uint32(10)
          w.bytes(obj.peerID)
        }

        if (obj.signedPeerRecord != null) {
          w.uint32(18)
          w.bytes(obj.signedPeerRecord)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peerID = reader.bytes()
              break
            case 2:
              obj.signedPeerRecord = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
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

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerInfo => {
    return decodeMessage(buf, PeerInfo.codec())
  }
}

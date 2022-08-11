/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

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
        _codec = message<SubOpts>((obj, writer, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            writer.fork()
          }

          if (obj.subscribe != null) {
            writer.uint32(8)
            writer.bool(obj.subscribe)
          }

          if (obj.topic != null) {
            writer.uint32(18)
            writer.string(obj.topic)
          }

          if (opts.lengthDelimited !== false) {
            writer.ldelim()
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

    export const encode = (obj: SubOpts): Uint8Array => {
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
        _codec = message<Message>((obj, writer, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            writer.fork()
          }

          if (obj.from != null) {
            writer.uint32(10)
            writer.bytes(obj.from)
          }

          if (obj.data != null) {
            writer.uint32(18)
            writer.bytes(obj.data)
          }

          if (obj.sequenceNumber != null) {
            writer.uint32(26)
            writer.bytes(obj.sequenceNumber)
          }

          if (obj.topic != null) {
            writer.uint32(34)
            writer.string(obj.topic)
          }

          if (obj.signature != null) {
            writer.uint32(42)
            writer.bytes(obj.signature)
          }

          if (obj.key != null) {
            writer.uint32(50)
            writer.bytes(obj.key)
          }

          if (opts.lengthDelimited !== false) {
            writer.ldelim()
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

    export const encode = (obj: Message): Uint8Array => {
      return encodeMessage(obj, Message.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): Message => {
      return decodeMessage(buf, Message.codec())
    }
  }

  let _codec: Codec<RPC>

  export const codec = (): Codec<RPC> => {
    if (_codec == null) {
      _codec = message<RPC>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.subscriptions != null) {
          for (const value of obj.subscriptions) {
            writer.uint32(10)
            RPC.SubOpts.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "subscriptions" was not found in object')
        }

        if (obj.messages != null) {
          for (const value of obj.messages) {
            writer.uint32(18)
            RPC.Message.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "messages" was not found in object')
        }

        if (obj.control != null) {
          writer.uint32(26)
          ControlMessage.codec().encode(obj.control, writer)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: RPC): Uint8Array => {
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
      _codec = message<ControlMessage>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.ihave != null) {
          for (const value of obj.ihave) {
            writer.uint32(10)
            ControlIHave.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "ihave" was not found in object')
        }

        if (obj.iwant != null) {
          for (const value of obj.iwant) {
            writer.uint32(18)
            ControlIWant.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "iwant" was not found in object')
        }

        if (obj.graft != null) {
          for (const value of obj.graft) {
            writer.uint32(26)
            ControlGraft.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "graft" was not found in object')
        }

        if (obj.prune != null) {
          for (const value of obj.prune) {
            writer.uint32(34)
            ControlPrune.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "prune" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: ControlMessage): Uint8Array => {
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
      _codec = message<ControlIHave>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.topic != null) {
          writer.uint32(10)
          writer.string(obj.topic)
        }

        if (obj.messageIDs != null) {
          for (const value of obj.messageIDs) {
            writer.uint32(18)
            writer.bytes(value)
          }
        } else {
          throw new Error('Protocol error: required field "messageIDs" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: ControlIHave): Uint8Array => {
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
      _codec = message<ControlIWant>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.messageIDs != null) {
          for (const value of obj.messageIDs) {
            writer.uint32(10)
            writer.bytes(value)
          }
        } else {
          throw new Error('Protocol error: required field "messageIDs" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: ControlIWant): Uint8Array => {
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
      _codec = message<ControlGraft>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.topic != null) {
          writer.uint32(10)
          writer.string(obj.topic)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: ControlGraft): Uint8Array => {
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
      _codec = message<ControlPrune>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.topic != null) {
          writer.uint32(10)
          writer.string(obj.topic)
        }

        if (obj.peers != null) {
          for (const value of obj.peers) {
            writer.uint32(18)
            PeerInfo.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "peers" was not found in object')
        }

        if (obj.backoff != null) {
          writer.uint32(24)
          writer.uint64(obj.backoff)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: ControlPrune): Uint8Array => {
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
      _codec = message<PeerInfo>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.peerID != null) {
          writer.uint32(10)
          writer.bytes(obj.peerID)
        }

        if (obj.signedPeerRecord != null) {
          writer.uint32(18)
          writer.bytes(obj.signedPeerRecord)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: PeerInfo): Uint8Array => {
    return encodeMessage(obj, PeerInfo.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerInfo => {
    return decodeMessage(buf, PeerInfo.codec())
  }
}

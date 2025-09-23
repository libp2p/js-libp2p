/* eslint-disable complexity */

import { decodeMessage, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
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
        }, (reader, length, opts = {}) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.subscribe = reader.bool()
                break
              }
              case 2: {
                obj.topic = reader.string()
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

    export const encode = (obj: Partial<SubOpts>): Uint8Array => {
      return encodeMessage(obj, SubOpts.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubOpts>): SubOpts => {
      return decodeMessage(buf, SubOpts.codec(), opts)
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
        }, (reader, length, opts = {}) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.from = reader.bytes()
                break
              }
              case 2: {
                obj.data = reader.bytes()
                break
              }
              case 3: {
                obj.sequenceNumber = reader.bytes()
                break
              }
              case 4: {
                obj.topic = reader.string()
                break
              }
              case 5: {
                obj.signature = reader.bytes()
                break
              }
              case 6: {
                obj.key = reader.bytes()
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          subscriptions: [],
          messages: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.subscriptions != null && obj.subscriptions.length === opts.limits.subscriptions) {
                throw new MaxLengthError('Decode error - map field "subscriptions" had too many elements')
              }

              obj.subscriptions.push(RPC.SubOpts.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.subscriptions$
              }))
              break
            }
            case 2: {
              if (opts.limits?.messages != null && obj.messages.length === opts.limits.messages) {
                throw new MaxLengthError('Decode error - map field "messages" had too many elements')
              }

              obj.messages.push(RPC.Message.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.messages$
              }))
              break
            }
            case 3: {
              obj.control = ControlMessage.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.control
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

  export const encode = (obj: Partial<RPC>): Uint8Array => {
    return encodeMessage(obj, RPC.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RPC>): RPC => {
    return decodeMessage(buf, RPC.codec(), opts)
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
      }, (reader, length, opts = {}) => {
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
            case 1: {
              if (opts.limits?.ihave != null && obj.ihave.length === opts.limits.ihave) {
                throw new MaxLengthError('Decode error - map field "ihave" had too many elements')
              }

              obj.ihave.push(ControlIHave.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.ihave$
              }))
              break
            }
            case 2: {
              if (opts.limits?.iwant != null && obj.iwant.length === opts.limits.iwant) {
                throw new MaxLengthError('Decode error - map field "iwant" had too many elements')
              }

              obj.iwant.push(ControlIWant.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.iwant$
              }))
              break
            }
            case 3: {
              if (opts.limits?.graft != null && obj.graft.length === opts.limits.graft) {
                throw new MaxLengthError('Decode error - map field "graft" had too many elements')
              }

              obj.graft.push(ControlGraft.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.graft$
              }))
              break
            }
            case 4: {
              if (opts.limits?.prune != null && obj.prune.length === opts.limits.prune) {
                throw new MaxLengthError('Decode error - map field "prune" had too many elements')
              }

              obj.prune.push(ControlPrune.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.prune$
              }))
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

  export const encode = (obj: Partial<ControlMessage>): Uint8Array => {
    return encodeMessage(obj, ControlMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlMessage>): ControlMessage => {
    return decodeMessage(buf, ControlMessage.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          messageIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.topic = reader.string()
              break
            }
            case 2: {
              if (opts.limits?.messageIDs != null && obj.messageIDs.length === opts.limits.messageIDs) {
                throw new MaxLengthError('Decode error - map field "messageIDs" had too many elements')
              }

              obj.messageIDs.push(reader.bytes())
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

  export const encode = (obj: Partial<ControlIHave>): Uint8Array => {
    return encodeMessage(obj, ControlIHave.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIHave>): ControlIHave => {
    return decodeMessage(buf, ControlIHave.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          messageIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.messageIDs != null && obj.messageIDs.length === opts.limits.messageIDs) {
                throw new MaxLengthError('Decode error - map field "messageIDs" had too many elements')
              }

              obj.messageIDs.push(reader.bytes())
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

  export const encode = (obj: Partial<ControlIWant>): Uint8Array => {
    return encodeMessage(obj, ControlIWant.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIWant>): ControlIWant => {
    return decodeMessage(buf, ControlIWant.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.topic = reader.string()
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

  export const encode = (obj: Partial<ControlGraft>): Uint8Array => {
    return encodeMessage(obj, ControlGraft.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlGraft>): ControlGraft => {
    return decodeMessage(buf, ControlGraft.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          peers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.topic = reader.string()
              break
            }
            case 2: {
              if (opts.limits?.peers != null && obj.peers.length === opts.limits.peers) {
                throw new MaxLengthError('Decode error - map field "peers" had too many elements')
              }

              obj.peers.push(PeerInfo.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.peers$
              }))
              break
            }
            case 3: {
              obj.backoff = reader.uint64()
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

  export const encode = (obj: Partial<ControlPrune>): Uint8Array => {
    return encodeMessage(obj, ControlPrune.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlPrune>): ControlPrune => {
    return decodeMessage(buf, ControlPrune.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peerID = reader.bytes()
              break
            }
            case 2: {
              obj.signedPeerRecord = reader.bytes()
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

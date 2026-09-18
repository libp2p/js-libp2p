import { decodeMessage, encodeMessage, MaxLengthError, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface RPC {
  subscriptions: RPC.SubOpts[]
  messages: RPC.Message[]
  control?: RPC.ControlMessage
}

export interface RPCInput {
  subscriptions?: RPC.SubOptsInput[]
  messages?: RPC.MessageInput[]
  control?: RPC.ControlMessageInput
}

export namespace RPC {
  export interface SubOpts {
    subscribe?: boolean
    topic?: string
  }

  export interface SubOptsInput {
    subscribe?: boolean
    topic?: string
  }

  export namespace SubOpts {
    let _codec: Codec<SubOpts, SubOptsInput>

    export const codec = (): Codec<SubOpts, SubOptsInput> => {
      if (_codec == null) {
        _codec = message<SubOpts, SubOptsInput>((obj, w, opts = {}) => {
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
        }, (r, length) => {
          const obj: any = {}

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.subscribe = r.bool()
                break
              }
              case 2: {
                obj.topic = r.string()
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix) {
          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.SubOpts'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}subscribe`,
                  value: r.bool()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}topic`,
                  value: r.string()
                }
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.SubOpts'
            }
          }
        })
      }

      return _codec
    }

    export interface SubOptsSubscribeFieldEvent {
      field: '.subscribe'
      value: boolean
    }

    export interface SubOptsTopicFieldEvent {
      field: '.topic'
      value: string
    }

    export function encode (obj: SubOptsInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, SubOpts.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubOpts>): SubOpts {
      return decodeMessage(buf, SubOpts.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubOpts>): Generator<SubOptsSubscribeFieldEvent | SubOptsTopicFieldEvent> {
      return streamMessage(buf, SubOpts.codec(), opts)
    }
  }

  export interface Message {
    from?: Uint8Array<ArrayBuffer>
    data?: Uint8Array<ArrayBuffer>
    seqno?: Uint8Array<ArrayBuffer>
    topic: string
    signature?: Uint8Array<ArrayBuffer>
    key?: Uint8Array<ArrayBuffer>
  }

  export interface MessageInput {
    from?: Uint8Array
    data?: Uint8Array
    seqno?: Uint8Array
    topic?: string
    signature?: Uint8Array
    key?: Uint8Array
  }

  export namespace Message {
    let _codec: Codec<Message, MessageInput>

    export const codec = (): Codec<Message, MessageInput> => {
      if (_codec == null) {
        _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
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

          if (obj.seqno != null) {
            w.uint32(26)
            w.bytes(obj.seqno)
          }

          if ((obj.topic != null && obj.topic !== '')) {
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
        }, (r, length) => {
          const obj: any = {
            topic: ''
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.from = r.bytes()
                break
              }
              case 2: {
                obj.data = r.bytes()
                break
              }
              case 3: {
                obj.seqno = r.bytes()
                break
              }
              case 4: {
                obj.topic = r.string()
                break
              }
              case 5: {
                obj.signature = r.bytes()
                break
              }
              case 6: {
                obj.key = r.bytes()
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix) {
          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.Message'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}from`,
                  value: r.bytes()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}data`,
                  value: r.bytes()
                }
                break
              }
              case 3: {
                yield {
                  field: `${prefix}seqno`,
                  value: r.bytes()
                }
                break
              }
              case 4: {
                yield {
                  field: `${prefix}topic`,
                  value: r.string()
                }
                break
              }
              case 5: {
                yield {
                  field: `${prefix}signature`,
                  value: r.bytes()
                }
                break
              }
              case 6: {
                yield {
                  field: `${prefix}key`,
                  value: r.bytes()
                }
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.Message'
            }
          }
        })
      }

      return _codec
    }

    export interface MessageFromFieldEvent {
      field: '.from'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageDataFieldEvent {
      field: '.data'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageSeqnoFieldEvent {
      field: '.seqno'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageTopicFieldEvent {
      field: '.topic'
      value: string
    }

    export interface MessageSignatureFieldEvent {
      field: '.signature'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageKeyFieldEvent {
      field: '.key'
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, Message.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
      return decodeMessage(buf, Message.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageFromFieldEvent | MessageDataFieldEvent | MessageSeqnoFieldEvent | MessageTopicFieldEvent | MessageSignatureFieldEvent | MessageKeyFieldEvent> {
      return streamMessage(buf, Message.codec(), opts)
    }
  }

  export interface ControlMessage {
    ihave: RPC.ControlIHave[]
    iwant: RPC.ControlIWant[]
    graft: RPC.ControlGraft[]
    prune: RPC.ControlPrune[]
    idontwant: RPC.ControlIDontWant[]
  }

  export interface ControlMessageInput {
    ihave?: RPC.ControlIHaveInput[]
    iwant?: RPC.ControlIWantInput[]
    graft?: RPC.ControlGraftInput[]
    prune?: RPC.ControlPruneInput[]
    idontwant?: RPC.ControlIDontWantInput[]
  }

  export namespace ControlMessage {
    let _codec: Codec<ControlMessage, ControlMessageInput>

    export const codec = (): Codec<ControlMessage, ControlMessageInput> => {
      if (_codec == null) {
        _codec = message<ControlMessage, ControlMessageInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.ihave != null && obj.ihave.length > 0) {
            for (const value of obj.ihave) {
              w.uint32(10)
              RPC.ControlIHave.codec().encode(value, w)
            }
          }

          if (obj.iwant != null && obj.iwant.length > 0) {
            for (const value of obj.iwant) {
              w.uint32(18)
              RPC.ControlIWant.codec().encode(value, w)
            }
          }

          if (obj.graft != null && obj.graft.length > 0) {
            for (const value of obj.graft) {
              w.uint32(26)
              RPC.ControlGraft.codec().encode(value, w)
            }
          }

          if (obj.prune != null && obj.prune.length > 0) {
            for (const value of obj.prune) {
              w.uint32(34)
              RPC.ControlPrune.codec().encode(value, w)
            }
          }

          if (obj.idontwant != null && obj.idontwant.length > 0) {
            for (const value of obj.idontwant) {
              w.uint32(42)
              RPC.ControlIDontWant.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length, opts = {}) => {
          const obj: any = {
            ihave: [],
            iwant: [],
            graft: [],
            prune: [],
            idontwant: []
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.ihave != null && obj.ihave.length === opts.limits.ihave) {
                  throw new MaxLengthError('Decode error - repeated field "ihave" had too many elements')
                }

                obj.ihave.push(RPC.ControlIHave.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.ihave$
                }))
                break
              }
              case 2: {
                if (opts.limits?.iwant != null && obj.iwant.length === opts.limits.iwant) {
                  throw new MaxLengthError('Decode error - repeated field "iwant" had too many elements')
                }

                obj.iwant.push(RPC.ControlIWant.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.iwant$
                }))
                break
              }
              case 3: {
                if (opts.limits?.graft != null && obj.graft.length === opts.limits.graft) {
                  throw new MaxLengthError('Decode error - repeated field "graft" had too many elements')
                }

                obj.graft.push(RPC.ControlGraft.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.graft$
                }))
                break
              }
              case 4: {
                if (opts.limits?.prune != null && obj.prune.length === opts.limits.prune) {
                  throw new MaxLengthError('Decode error - repeated field "prune" had too many elements')
                }

                obj.prune.push(RPC.ControlPrune.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.prune$
                }))
                break
              }
              case 5: {
                if (opts.limits?.idontwant != null && obj.idontwant.length === opts.limits.idontwant) {
                  throw new MaxLengthError('Decode error - repeated field "idontwant" had too many elements')
                }

                obj.idontwant.push(RPC.ControlIDontWant.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.idontwant$
                }))
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix, opts = {}) {
          const obj = {
            ihave: 0,
            iwant: 0,
            graft: 0,
            prune: 0,
            idontwant: 0
          }

          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlMessage'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.ihave != null && obj.ihave === opts.limits.ihave) {
                  throw new MaxLengthError('Streaming decode error - repeated field "ihave" had too many elements')
                }

                for (const evt of RPC.ControlIHave.codec().stream(r, r.uint32(), `${prefix}ihave[].`, {
                  limits: opts.limits?.ihave$
                })) {
                  yield {
                    ...evt,
                    index: obj.ihave
                  }
                }

                obj.ihave++

                break
              }
              case 2: {
                if (opts.limits?.iwant != null && obj.iwant === opts.limits.iwant) {
                  throw new MaxLengthError('Streaming decode error - repeated field "iwant" had too many elements')
                }

                for (const evt of RPC.ControlIWant.codec().stream(r, r.uint32(), `${prefix}iwant[].`, {
                  limits: opts.limits?.iwant$
                })) {
                  yield {
                    ...evt,
                    index: obj.iwant
                  }
                }

                obj.iwant++

                break
              }
              case 3: {
                if (opts.limits?.graft != null && obj.graft === opts.limits.graft) {
                  throw new MaxLengthError('Streaming decode error - repeated field "graft" had too many elements')
                }

                for (const evt of RPC.ControlGraft.codec().stream(r, r.uint32(), `${prefix}graft[].`, {
                  limits: opts.limits?.graft$
                })) {
                  yield {
                    ...evt,
                    index: obj.graft
                  }
                }

                obj.graft++

                break
              }
              case 4: {
                if (opts.limits?.prune != null && obj.prune === opts.limits.prune) {
                  throw new MaxLengthError('Streaming decode error - repeated field "prune" had too many elements')
                }

                for (const evt of RPC.ControlPrune.codec().stream(r, r.uint32(), `${prefix}prune[].`, {
                  limits: opts.limits?.prune$
                })) {
                  yield {
                    ...evt,
                    index: obj.prune
                  }
                }

                obj.prune++

                break
              }
              case 5: {
                if (opts.limits?.idontwant != null && obj.idontwant === opts.limits.idontwant) {
                  throw new MaxLengthError('Streaming decode error - repeated field "idontwant" had too many elements')
                }

                for (const evt of RPC.ControlIDontWant.codec().stream(r, r.uint32(), `${prefix}idontwant[].`, {
                  limits: opts.limits?.idontwant$
                })) {
                  yield {
                    ...evt,
                    index: obj.idontwant
                  }
                }

                obj.idontwant++

                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlMessage'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlMessageIhaveTopicIDFieldEvent {
      field: '.ihave[].topicID'
      value: string
      index: number
    }

    export interface ControlMessageIhaveMessageIDsFieldEvent {
      field: '.ihave[].messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export interface ControlMessageIhaveMessageStartEvent {
      field: '.ihave[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessageIhaveMessageEndEvent {
      field: '.ihave[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlMessageIwantMessageIDsFieldEvent {
      field: '.iwant[].messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export interface ControlMessageIwantMessageStartEvent {
      field: '.iwant[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessageIwantMessageEndEvent {
      field: '.iwant[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlMessageGraftTopicIDFieldEvent {
      field: '.graft[].topicID'
      value: string
      index: number
    }

    export interface ControlMessageGraftMessageStartEvent {
      field: '.graft[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessageGraftMessageEndEvent {
      field: '.graft[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlMessagePruneTopicIDFieldEvent {
      field: '.prune[].topicID'
      value: string
      index: number
    }

    export interface ControlMessagePrunePeersPeerIDFieldEvent {
      field: '.prune[].peers[].peerID'
      value: Uint8Array<ArrayBuffer>
      index: number
    }

    export interface ControlMessagePrunePeersSignedPeerRecordFieldEvent {
      field: '.prune[].peers[].signedPeerRecord'
      value: Uint8Array<ArrayBuffer>
      index: number
    }

    export interface ControlMessagePrunePeersMessageStartEvent {
      field: '.prune[].peers[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessagePrunePeersMessageEndEvent {
      field: '.prune[].peers[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlMessagePruneBackoffFieldEvent {
      field: '.prune[].backoff'
      value: number
      index: number
    }

    export interface ControlMessagePruneMessageStartEvent {
      field: '.prune[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessagePruneMessageEndEvent {
      field: '.prune[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlMessageIdontwantMessageIDsFieldEvent {
      field: '.idontwant[].messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export interface ControlMessageIdontwantMessageStartEvent {
      field: '.idontwant[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlMessageIdontwantMessageEndEvent {
      field: '.idontwant[]'
      index: number
      type: 'end'
      message: string
    }

    export function encode (obj: ControlMessageInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlMessage.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlMessage>): ControlMessage {
      return decodeMessage(buf, ControlMessage.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlMessage>): Generator<ControlMessageIhaveTopicIDFieldEvent | ControlMessageIhaveMessageIDsFieldEvent | ControlMessageIhaveMessageStartEvent | ControlMessageIhaveMessageEndEvent | ControlMessageIwantMessageIDsFieldEvent | ControlMessageIwantMessageStartEvent | ControlMessageIwantMessageEndEvent | ControlMessageGraftTopicIDFieldEvent | ControlMessageGraftMessageStartEvent | ControlMessageGraftMessageEndEvent | ControlMessagePruneTopicIDFieldEvent | ControlMessagePrunePeersPeerIDFieldEvent | ControlMessagePrunePeersSignedPeerRecordFieldEvent | ControlMessagePrunePeersMessageStartEvent | ControlMessagePrunePeersMessageEndEvent | ControlMessagePruneBackoffFieldEvent | ControlMessagePruneMessageStartEvent | ControlMessagePruneMessageEndEvent | ControlMessageIdontwantMessageIDsFieldEvent | ControlMessageIdontwantMessageStartEvent | ControlMessageIdontwantMessageEndEvent> {
      return streamMessage(buf, ControlMessage.codec(), opts)
    }
  }

  export interface ControlIHave {
    topicID?: string
    messageIDs: Uint8Array<ArrayBuffer>[]
  }

  export interface ControlIHaveInput {
    topicID?: string
    messageIDs?: Uint8Array[]
  }

  export namespace ControlIHave {
    let _codec: Codec<ControlIHave, ControlIHaveInput>

    export const codec = (): Codec<ControlIHave, ControlIHaveInput> => {
      if (_codec == null) {
        _codec = message<ControlIHave, ControlIHaveInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.topicID != null) {
            w.uint32(10)
            w.string(obj.topicID)
          }

          if (obj.messageIDs != null && obj.messageIDs.length > 0) {
            for (const value of obj.messageIDs) {
              w.uint32(18)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length, opts = {}) => {
          const obj: any = {
            messageIDs: []
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.topicID = r.string()
                break
              }
              case 2: {
                if (opts.limits?.messageIDs != null && obj.messageIDs.length === opts.limits.messageIDs) {
                  throw new MaxLengthError('Decode error - repeated field "messageIDs" had too many elements')
                }

                obj.messageIDs.push(r.bytes())
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix, opts = {}) {
          const obj = {
            messageIDs: 0
          }

          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlIHave'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}topicID`,
                  value: r.string()
                }
                break
              }
              case 2: {
                if (opts.limits?.messageIDs != null && obj.messageIDs === opts.limits.messageIDs) {
                  throw new MaxLengthError('Streaming decode error - repeated field "messageIDs" had too many elements')
                }

                yield {
                  field: `${prefix}messageIDs[]`,
                  index: obj.messageIDs,
                  value: r.bytes()
                }

                obj.messageIDs++

                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlIHave'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlIHaveTopicIDFieldEvent {
      field: '.topicID'
      value: string
    }

    export interface ControlIHaveMessageIDsFieldEvent {
      field: '.messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: ControlIHaveInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlIHave.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIHave>): ControlIHave {
      return decodeMessage(buf, ControlIHave.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIHave>): Generator<ControlIHaveTopicIDFieldEvent | ControlIHaveMessageIDsFieldEvent> {
      return streamMessage(buf, ControlIHave.codec(), opts)
    }
  }

  export interface ControlIWant {
    messageIDs: Uint8Array<ArrayBuffer>[]
  }

  export interface ControlIWantInput {
    messageIDs?: Uint8Array[]
  }

  export namespace ControlIWant {
    let _codec: Codec<ControlIWant, ControlIWantInput>

    export const codec = (): Codec<ControlIWant, ControlIWantInput> => {
      if (_codec == null) {
        _codec = message<ControlIWant, ControlIWantInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.messageIDs != null && obj.messageIDs.length > 0) {
            for (const value of obj.messageIDs) {
              w.uint32(10)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length, opts = {}) => {
          const obj: any = {
            messageIDs: []
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.messageIDs != null && obj.messageIDs.length === opts.limits.messageIDs) {
                  throw new MaxLengthError('Decode error - repeated field "messageIDs" had too many elements')
                }

                obj.messageIDs.push(r.bytes())
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix, opts = {}) {
          const obj = {
            messageIDs: 0
          }

          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlIWant'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.messageIDs != null && obj.messageIDs === opts.limits.messageIDs) {
                  throw new MaxLengthError('Streaming decode error - repeated field "messageIDs" had too many elements')
                }

                yield {
                  field: `${prefix}messageIDs[]`,
                  index: obj.messageIDs,
                  value: r.bytes()
                }

                obj.messageIDs++

                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlIWant'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlIWantMessageIDsFieldEvent {
      field: '.messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: ControlIWantInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlIWant.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIWant>): ControlIWant {
      return decodeMessage(buf, ControlIWant.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIWant>): Generator<ControlIWantMessageIDsFieldEvent> {
      return streamMessage(buf, ControlIWant.codec(), opts)
    }
  }

  export interface ControlGraft {
    topicID?: string
  }

  export interface ControlGraftInput {
    topicID?: string
  }

  export namespace ControlGraft {
    let _codec: Codec<ControlGraft, ControlGraftInput>

    export const codec = (): Codec<ControlGraft, ControlGraftInput> => {
      if (_codec == null) {
        _codec = message<ControlGraft, ControlGraftInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.topicID != null) {
            w.uint32(10)
            w.string(obj.topicID)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length) => {
          const obj: any = {}

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.topicID = r.string()
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix) {
          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlGraft'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}topicID`,
                  value: r.string()
                }
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlGraft'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlGraftTopicIDFieldEvent {
      field: '.topicID'
      value: string
    }

    export function encode (obj: ControlGraftInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlGraft.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlGraft>): ControlGraft {
      return decodeMessage(buf, ControlGraft.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlGraft>): Generator<ControlGraftTopicIDFieldEvent> {
      return streamMessage(buf, ControlGraft.codec(), opts)
    }
  }

  export interface ControlPrune {
    topicID?: string
    peers: RPC.PeerInfo[]
    backoff?: number
  }

  export interface ControlPruneInput {
    topicID?: string
    peers?: RPC.PeerInfoInput[]
    backoff?: number
  }

  export namespace ControlPrune {
    let _codec: Codec<ControlPrune, ControlPruneInput>

    export const codec = (): Codec<ControlPrune, ControlPruneInput> => {
      if (_codec == null) {
        _codec = message<ControlPrune, ControlPruneInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.topicID != null) {
            w.uint32(10)
            w.string(obj.topicID)
          }

          if (obj.peers != null && obj.peers.length > 0) {
            for (const value of obj.peers) {
              w.uint32(18)
              RPC.PeerInfo.codec().encode(value, w)
            }
          }

          if (obj.backoff != null) {
            w.uint32(24)
            w.uint64Number(obj.backoff)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length, opts = {}) => {
          const obj: any = {
            peers: []
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.topicID = r.string()
                break
              }
              case 2: {
                if (opts.limits?.peers != null && obj.peers.length === opts.limits.peers) {
                  throw new MaxLengthError('Decode error - repeated field "peers" had too many elements')
                }

                obj.peers.push(RPC.PeerInfo.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.peers$
                }))
                break
              }
              case 3: {
                obj.backoff = r.uint64Number()
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix, opts = {}) {
          const obj = {
            peers: 0
          }

          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlPrune'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}topicID`,
                  value: r.string()
                }
                break
              }
              case 2: {
                if (opts.limits?.peers != null && obj.peers === opts.limits.peers) {
                  throw new MaxLengthError('Streaming decode error - repeated field "peers" had too many elements')
                }

                for (const evt of RPC.PeerInfo.codec().stream(r, r.uint32(), `${prefix}peers[].`, {
                  limits: opts.limits?.peers$
                })) {
                  yield {
                    ...evt,
                    index: obj.peers
                  }
                }

                obj.peers++

                break
              }
              case 3: {
                yield {
                  field: `${prefix}backoff`,
                  value: r.uint64Number()
                }
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlPrune'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlPruneTopicIDFieldEvent {
      field: '.topicID'
      value: string
    }

    export interface ControlPrunePeersPeerIDFieldEvent {
      field: '.peers[].peerID'
      value: Uint8Array<ArrayBuffer>
      index: number
    }

    export interface ControlPrunePeersSignedPeerRecordFieldEvent {
      field: '.peers[].signedPeerRecord'
      value: Uint8Array<ArrayBuffer>
      index: number
    }

    export interface ControlPrunePeersMessageStartEvent {
      field: '.peers[]'
      index: number
      type: 'start'
      message: string
    }

    export interface ControlPrunePeersMessageEndEvent {
      field: '.peers[]'
      index: number
      type: 'end'
      message: string
    }

    export interface ControlPruneBackoffFieldEvent {
      field: '.backoff'
      value: number
    }

    export function encode (obj: ControlPruneInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlPrune.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlPrune>): ControlPrune {
      return decodeMessage(buf, ControlPrune.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlPrune>): Generator<ControlPruneTopicIDFieldEvent | ControlPrunePeersPeerIDFieldEvent | ControlPrunePeersSignedPeerRecordFieldEvent | ControlPrunePeersMessageStartEvent | ControlPrunePeersMessageEndEvent | ControlPruneBackoffFieldEvent> {
      return streamMessage(buf, ControlPrune.codec(), opts)
    }
  }

  export interface PeerInfo {
    peerID?: Uint8Array<ArrayBuffer>
    signedPeerRecord?: Uint8Array<ArrayBuffer>
  }

  export interface PeerInfoInput {
    peerID?: Uint8Array
    signedPeerRecord?: Uint8Array
  }

  export namespace PeerInfo {
    let _codec: Codec<PeerInfo, PeerInfoInput>

    export const codec = (): Codec<PeerInfo, PeerInfoInput> => {
      if (_codec == null) {
        _codec = message<PeerInfo, PeerInfoInput>((obj, w, opts = {}) => {
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
        }, (r, length) => {
          const obj: any = {}

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.peerID = r.bytes()
                break
              }
              case 2: {
                obj.signedPeerRecord = r.bytes()
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix) {
          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.PeerInfo'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}peerID`,
                  value: r.bytes()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}signedPeerRecord`,
                  value: r.bytes()
                }
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.PeerInfo'
            }
          }
        })
      }

      return _codec
    }

    export interface PeerInfoPeerIDFieldEvent {
      field: '.peerID'
      value: Uint8Array<ArrayBuffer>
    }

    export interface PeerInfoSignedPeerRecordFieldEvent {
      field: '.signedPeerRecord'
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: PeerInfoInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, PeerInfo.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo {
      return decodeMessage(buf, PeerInfo.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): Generator<PeerInfoPeerIDFieldEvent | PeerInfoSignedPeerRecordFieldEvent> {
      return streamMessage(buf, PeerInfo.codec(), opts)
    }
  }

  export interface ControlIDontWant {
    messageIDs: Uint8Array<ArrayBuffer>[]
  }

  export interface ControlIDontWantInput {
    messageIDs?: Uint8Array[]
  }

  export namespace ControlIDontWant {
    let _codec: Codec<ControlIDontWant, ControlIDontWantInput>

    export const codec = (): Codec<ControlIDontWant, ControlIDontWantInput> => {
      if (_codec == null) {
        _codec = message<ControlIDontWant, ControlIDontWantInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.messageIDs != null && obj.messageIDs.length > 0) {
            for (const value of obj.messageIDs) {
              w.uint32(10)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length, opts = {}) => {
          const obj: any = {
            messageIDs: []
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.messageIDs != null && obj.messageIDs.length === opts.limits.messageIDs) {
                  throw new MaxLengthError('Decode error - repeated field "messageIDs" had too many elements')
                }

                obj.messageIDs.push(r.bytes())
                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (r, length, prefix, opts = {}) {
          const obj = {
            messageIDs: 0
          }

          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'RPC.ControlIDontWant'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.messageIDs != null && obj.messageIDs === opts.limits.messageIDs) {
                  throw new MaxLengthError('Streaming decode error - repeated field "messageIDs" had too many elements')
                }

                yield {
                  field: `${prefix}messageIDs[]`,
                  index: obj.messageIDs,
                  value: r.bytes()
                }

                obj.messageIDs++

                break
              }
              default: {
                r.skipType(tag & 7)
                break
              }
            }
          }

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'end',
              message: 'RPC.ControlIDontWant'
            }
          }
        })
      }

      return _codec
    }

    export interface ControlIDontWantMessageIDsFieldEvent {
      field: '.messageIDs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: ControlIDontWantInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, ControlIDontWant.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIDontWant>): ControlIDontWant {
      return decodeMessage(buf, ControlIDontWant.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlIDontWant>): Generator<ControlIDontWantMessageIDsFieldEvent> {
      return streamMessage(buf, ControlIDontWant.codec(), opts)
    }
  }

  let _codec: Codec<RPC, RPCInput>

  export const codec = (): Codec<RPC, RPCInput> => {
    if (_codec == null) {
      _codec = message<RPC, RPCInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.subscriptions != null && obj.subscriptions.length > 0) {
          for (const value of obj.subscriptions) {
            w.uint32(10)
            RPC.SubOpts.codec().encode(value, w)
          }
        }

        if (obj.messages != null && obj.messages.length > 0) {
          for (const value of obj.messages) {
            w.uint32(18)
            RPC.Message.codec().encode(value, w)
          }
        }

        if (obj.control != null) {
          w.uint32(26)
          RPC.ControlMessage.codec().encode(obj.control, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          subscriptions: [],
          messages: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.subscriptions != null && obj.subscriptions.length === opts.limits.subscriptions) {
                throw new MaxLengthError('Decode error - repeated field "subscriptions" had too many elements')
              }

              obj.subscriptions.push(RPC.SubOpts.codec().decode(r, r.uint32(), {
                limits: opts.limits?.subscriptions$
              }))
              break
            }
            case 2: {
              if (opts.limits?.messages != null && obj.messages.length === opts.limits.messages) {
                throw new MaxLengthError('Decode error - repeated field "messages" had too many elements')
              }

              obj.messages.push(RPC.Message.codec().decode(r, r.uint32(), {
                limits: opts.limits?.messages$
              }))
              break
            }
            case 3: {
              obj.control = RPC.ControlMessage.codec().decode(r, r.uint32(), {
                limits: opts.limits?.control
              })
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          subscriptions: 0,
          messages: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'RPC'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.subscriptions != null && obj.subscriptions === opts.limits.subscriptions) {
                throw new MaxLengthError('Streaming decode error - repeated field "subscriptions" had too many elements')
              }

              for (const evt of RPC.SubOpts.codec().stream(r, r.uint32(), `${prefix}subscriptions[].`, {
                limits: opts.limits?.subscriptions$
              })) {
                yield {
                  ...evt,
                  index: obj.subscriptions
                }
              }

              obj.subscriptions++

              break
            }
            case 2: {
              if (opts.limits?.messages != null && obj.messages === opts.limits.messages) {
                throw new MaxLengthError('Streaming decode error - repeated field "messages" had too many elements')
              }

              for (const evt of RPC.Message.codec().stream(r, r.uint32(), `${prefix}messages[].`, {
                limits: opts.limits?.messages$
              })) {
                yield {
                  ...evt,
                  index: obj.messages
                }
              }

              obj.messages++

              break
            }
            case 3: {
              yield * RPC.ControlMessage.codec().stream(r, r.uint32(), `${prefix}control.`, {
                limits: opts.limits?.control
              })

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'RPC'
          }
        }
      })
    }

    return _codec
  }

  export interface RPCSubscriptionsSubscribeFieldEvent {
    field: '.subscriptions[].subscribe'
    value: boolean
    index: number
  }

  export interface RPCSubscriptionsTopicFieldEvent {
    field: '.subscriptions[].topic'
    value: string
    index: number
  }

  export interface RPCSubscriptionsMessageStartEvent {
    field: '.subscriptions[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCSubscriptionsMessageEndEvent {
    field: '.subscriptions[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCMessagesFromFieldEvent {
    field: '.messages[].from'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesDataFieldEvent {
    field: '.messages[].data'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesSeqnoFieldEvent {
    field: '.messages[].seqno'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesTopicFieldEvent {
    field: '.messages[].topic'
    value: string
    index: number
  }

  export interface RPCMessagesSignatureFieldEvent {
    field: '.messages[].signature'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesKeyFieldEvent {
    field: '.messages[].key'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesMessageStartEvent {
    field: '.messages[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCMessagesMessageEndEvent {
    field: '.messages[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlMessageStart {
    field: '.control'
    type: 'start'
  }

  export interface RPCControlMessageEnd {
    field: '.control'
    type: 'end'
  }

  export interface RPCControlIhaveTopicIDFieldEvent {
    field: '.control.ihave[].topicID'
    value: string
    index: number
  }

  export interface RPCControlIhaveMessageIDsFieldEvent {
    field: '.control.ihave[].messageIDs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface RPCControlIhaveMessageStartEvent {
    field: '.control.ihave[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlIhaveMessageEndEvent {
    field: '.control.ihave[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlIwantMessageIDsFieldEvent {
    field: '.control.iwant[].messageIDs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface RPCControlIwantMessageStartEvent {
    field: '.control.iwant[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlIwantMessageEndEvent {
    field: '.control.iwant[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlGraftTopicIDFieldEvent {
    field: '.control.graft[].topicID'
    value: string
    index: number
  }

  export interface RPCControlGraftMessageStartEvent {
    field: '.control.graft[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlGraftMessageEndEvent {
    field: '.control.graft[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlPruneTopicIDFieldEvent {
    field: '.control.prune[].topicID'
    value: string
    index: number
  }

  export interface RPCControlPrunePeersPeerIDFieldEvent {
    field: '.control.prune[].peers[].peerID'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCControlPrunePeersSignedPeerRecordFieldEvent {
    field: '.control.prune[].peers[].signedPeerRecord'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCControlPrunePeersMessageStartEvent {
    field: '.control.prune[].peers[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlPrunePeersMessageEndEvent {
    field: '.control.prune[].peers[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlPruneBackoffFieldEvent {
    field: '.control.prune[].backoff'
    value: number
    index: number
  }

  export interface RPCControlPruneMessageStartEvent {
    field: '.control.prune[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlPruneMessageEndEvent {
    field: '.control.prune[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCControlIdontwantMessageIDsFieldEvent {
    field: '.control.idontwant[].messageIDs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface RPCControlIdontwantMessageStartEvent {
    field: '.control.idontwant[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCControlIdontwantMessageEndEvent {
    field: '.control.idontwant[]'
    index: number
    type: 'end'
    message: string
  }

  export function encode (obj: RPCInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, RPC.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RPC>): RPC {
    return decodeMessage(buf, RPC.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RPC>): Generator<RPCSubscriptionsSubscribeFieldEvent | RPCSubscriptionsTopicFieldEvent | RPCSubscriptionsMessageStartEvent | RPCSubscriptionsMessageEndEvent | RPCMessagesFromFieldEvent | RPCMessagesDataFieldEvent | RPCMessagesSeqnoFieldEvent | RPCMessagesTopicFieldEvent | RPCMessagesSignatureFieldEvent | RPCMessagesKeyFieldEvent | RPCMessagesMessageStartEvent | RPCMessagesMessageEndEvent | RPCControlMessageStart | RPCControlMessageEnd | RPCControlIhaveTopicIDFieldEvent | RPCControlIhaveMessageIDsFieldEvent | RPCControlIhaveMessageStartEvent | RPCControlIhaveMessageEndEvent | RPCControlIwantMessageIDsFieldEvent | RPCControlIwantMessageStartEvent | RPCControlIwantMessageEndEvent | RPCControlGraftTopicIDFieldEvent | RPCControlGraftMessageStartEvent | RPCControlGraftMessageEndEvent | RPCControlPruneTopicIDFieldEvent | RPCControlPrunePeersPeerIDFieldEvent | RPCControlPrunePeersSignedPeerRecordFieldEvent | RPCControlPrunePeersMessageStartEvent | RPCControlPrunePeersMessageEndEvent | RPCControlPruneBackoffFieldEvent | RPCControlPruneMessageStartEvent | RPCControlPruneMessageEndEvent | RPCControlIdontwantMessageIDsFieldEvent | RPCControlIdontwantMessageStartEvent | RPCControlIdontwantMessageEndEvent> {
    return streamMessage(buf, RPC.codec(), opts)
  }
}

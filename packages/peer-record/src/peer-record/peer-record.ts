import { decodeMessage, encodeMessage, MaxLengthError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PeerRecord {
  peerId: Uint8Array<ArrayBuffer>
  seq: bigint
  addresses: PeerRecord.AddressInfo[]
}

export interface PeerRecordInput {
  peerId?: Uint8Array
  seq?: bigint
  addresses?: PeerRecord.AddressInfoInput[]
}

export namespace PeerRecord {
  export interface AddressInfo {
    multiaddr: Uint8Array<ArrayBuffer>
  }

  export interface AddressInfoInput {
    multiaddr?: Uint8Array
  }

  export namespace AddressInfo {
    let _codec: Codec<AddressInfo, AddressInfoInput>

    export const codec = (): Codec<AddressInfo, AddressInfoInput> => {
      if (_codec == null) {
        _codec = message<AddressInfo, AddressInfoInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.multiaddr != null && obj.multiaddr.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.multiaddr)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (r, length) => {
          const obj: any = {
            multiaddr: uint8ArrayAlloc(0)
          }

          const end = length == null ? r.len : r.pos + length

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.multiaddr = r.bytes()
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
              message: 'PeerRecord.AddressInfo'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}multiaddr`,
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
              message: 'PeerRecord.AddressInfo'
            }
          }
        })
      }

      return _codec
    }

    export interface AddressInfoMultiaddrFieldEvent {
      field: '.multiaddr'
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: AddressInfoInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, AddressInfo.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AddressInfo>): AddressInfo {
      return decodeMessage(buf, AddressInfo.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AddressInfo>): Generator<AddressInfoMultiaddrFieldEvent> {
      return streamMessage(buf, AddressInfo.codec(), opts)
    }
  }

  let _codec: Codec<PeerRecord, PeerRecordInput>

  export const codec = (): Codec<PeerRecord, PeerRecordInput> => {
    if (_codec == null) {
      _codec = message<PeerRecord, PeerRecordInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peerId != null && obj.peerId.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peerId)
        }

        if ((obj.seq != null && obj.seq !== 0n)) {
          w.uint32(16)
          w.uint64(obj.seq)
        }

        if (obj.addresses != null && obj.addresses.length > 0) {
          for (const value of obj.addresses) {
            w.uint32(26)
            PeerRecord.AddressInfo.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          peerId: uint8ArrayAlloc(0),
          seq: 0n,
          addresses: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peerId = r.bytes()
              break
            }
            case 2: {
              obj.seq = r.uint64()
              break
            }
            case 3: {
              if (opts.limits?.addresses != null && obj.addresses.length === opts.limits.addresses) {
                throw new MaxLengthError('Decode error - repeated field "addresses" had too many elements')
              }

              obj.addresses.push(PeerRecord.AddressInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.addresses$
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
          addresses: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PeerRecord'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}peerId`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}seq`,
                value: r.uint64()
              }
              break
            }
            case 3: {
              if (opts.limits?.addresses != null && obj.addresses === opts.limits.addresses) {
                throw new MaxLengthError('Streaming decode error - repeated field "addresses" had too many elements')
              }

              for (const evt of PeerRecord.AddressInfo.codec().stream(r, r.uint32(), `${prefix}addresses[].`, {
                limits: opts.limits?.addresses$
              })) {
                yield {
                  ...evt,
                  index: obj.addresses
                }
              }

              obj.addresses++

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
            message: 'PeerRecord'
          }
        }
      })
    }

    return _codec
  }

  export interface PeerRecordPeerIdFieldEvent {
    field: '.peerId'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerRecordSeqFieldEvent {
    field: '.seq'
    value: bigint
  }

  export interface PeerRecordAddressesMultiaddrFieldEvent {
    field: '.addresses[].multiaddr'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface PeerRecordAddressesMessageStartEvent {
    field: '.addresses[]'
    index: number
    type: 'start'
    message: string
  }

  export interface PeerRecordAddressesMessageEndEvent {
    field: '.addresses[]'
    index: number
    type: 'end'
    message: string
  }

  export function encode (obj: PeerRecordInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PeerRecord.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerRecord>): PeerRecord {
    return decodeMessage(buf, PeerRecord.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerRecord>): Generator<PeerRecordPeerIdFieldEvent | PeerRecordSeqFieldEvent | PeerRecordAddressesMultiaddrFieldEvent | PeerRecordAddressesMessageStartEvent | PeerRecordAddressesMessageEndEvent> {
    return streamMessage(buf, PeerRecord.codec(), opts)
  }
}

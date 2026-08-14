import { decodeMessage, encodeMessage, MaxLengthError, MaxSizeError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Peer {
  addresses: Address[]
  protocols: string[]
  publicKey?: Uint8Array
  peerRecordEnvelope?: Uint8Array
  metadata: Map<string, Uint8Array>
  tags: Map<string, Tag>
  updated?: number
}

export namespace Peer {
  export interface Peer$metadataEntry {
    key: string
    value: Uint8Array
  }

  export namespace Peer$metadataEntry {
    let _codec: Codec<Peer$metadataEntry>

    export const codec = (): Codec<Peer$metadataEntry> => {
      if (_codec == null) {
        _codec = message<Peer$metadataEntry>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if ((obj.value != null && obj.value.byteLength > 0)) {
            w.uint32(18)
            w.bytes(obj.value)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: '',
            value: uint8ArrayAlloc(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                obj.value = reader.bytes()
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        }, function * (reader, length, prefix, opts = {}) {
          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}.key`,
                  value: reader.string()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}.value`,
                  value: reader.bytes()
                }
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }
        })
      }

      return _codec
    }

    export interface Peer$metadataEntryKeyFieldEvent {
      field: '$.key'
      value: string
    }

    export interface Peer$metadataEntryValueFieldEvent {
      field: '$.value'
      value: Uint8Array
    }

    export function encode (obj: Partial<Peer$metadataEntry>): Uint8Array {
      return encodeMessage(obj, Peer$metadataEntry.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer$metadataEntry>): Peer$metadataEntry {
      return decodeMessage(buf, Peer$metadataEntry.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer$metadataEntry>): Generator<Peer$metadataEntryKeyFieldEvent | Peer$metadataEntryValueFieldEvent> {
      return streamMessage(buf, Peer$metadataEntry.codec(), opts)
    }
  }

  export interface Peer$tagsEntry {
    key: string
    value?: Tag
  }

  export namespace Peer$tagsEntry {
    let _codec: Codec<Peer$tagsEntry>

    export const codec = (): Codec<Peer$tagsEntry> => {
      if (_codec == null) {
        _codec = message<Peer$tagsEntry>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if (obj.value != null) {
            w.uint32(18)
            Tag.codec().encode(obj.value, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                obj.value = Tag.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.value
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
        }, function * (reader, length, prefix, opts = {}) {
          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}.key`,
                  value: reader.string()
                }
                break
              }
              case 2: {
                yield * Tag.codec().stream(reader, reader.uint32(), `${prefix}.value`, {
                  limits: opts.limits?.value
                })

                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }
        })
      }

      return _codec
    }

    export interface Peer$tagsEntryKeyFieldEvent {
      field: '$.key'
      value: string
    }

    export interface Peer$tagsEntryValueValueFieldEvent {
      field: '$.value.value'
      value: number
    }

    export interface Peer$tagsEntryValueExpiryFieldEvent {
      field: '$.value.expiry'
      value: bigint
    }

    export function encode (obj: Partial<Peer$tagsEntry>): Uint8Array {
      return encodeMessage(obj, Peer$tagsEntry.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer$tagsEntry>): Peer$tagsEntry {
      return decodeMessage(buf, Peer$tagsEntry.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer$tagsEntry>): Generator<Peer$tagsEntryKeyFieldEvent | Peer$tagsEntryValueValueFieldEvent | Peer$tagsEntryValueExpiryFieldEvent> {
      return streamMessage(buf, Peer$tagsEntry.codec(), opts)
    }
  }

  let _codec: Codec<Peer>

  export const codec = (): Codec<Peer> => {
    if (_codec == null) {
      _codec = message<Peer>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.addresses != null && obj.addresses.length > 0) {
          for (const value of obj.addresses) {
            w.uint32(10)
            Address.codec().encode(value, w)
          }
        }

        if (obj.protocols != null && obj.protocols.length > 0) {
          for (const value of obj.protocols) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (obj.publicKey != null) {
          w.uint32(34)
          w.bytes(obj.publicKey)
        }

        if (obj.peerRecordEnvelope != null) {
          w.uint32(42)
          w.bytes(obj.peerRecordEnvelope)
        }

        if (obj.metadata != null && obj.metadata.size > 0) {
          for (const [key, value] of obj.metadata.entries()) {
            w.uint32(50)
            Peer.Peer$metadataEntry.codec().encode({ key, value }, w)
          }
        }

        if (obj.tags != null && obj.tags.size > 0) {
          for (const [key, value] of obj.tags.entries()) {
            w.uint32(58)
            Peer.Peer$tagsEntry.codec().encode({ key, value }, w)
          }
        }

        if (obj.updated != null) {
          w.uint32(64)
          w.uint64Number(obj.updated)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          addresses: [],
          protocols: [],
          metadata: new Map<string, Uint8Array>(),
          tags: new Map<string, Tag>()
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.addresses != null && obj.addresses.length === opts.limits.addresses) {
                throw new MaxLengthError('Decode error - repeated field "addresses" had too many elements')
              }

              obj.addresses.push(Address.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.addresses$
              }))
              break
            }
            case 2: {
              if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                throw new MaxLengthError('Decode error - repeated field "protocols" had too many elements')
              }

              obj.protocols.push(reader.string())
              break
            }
            case 4: {
              obj.publicKey = reader.bytes()
              break
            }
            case 5: {
              obj.peerRecordEnvelope = reader.bytes()
              break
            }
            case 6: {
              if (opts.limits?.metadata != null && obj.metadata.size === opts.limits.metadata) {
                throw new MaxSizeError('Decode error - map field "metadata" had too many elements')
              }

              const entry = Peer.Peer$metadataEntry.codec().decode(reader, reader.uint32(), {
                limits: {
                  value: opts.limits?.metadata$value
                }
              })
              obj.metadata.set(entry.key, entry.value)
              break
            }
            case 7: {
              if (opts.limits?.tags != null && obj.tags.size === opts.limits.tags) {
                throw new MaxSizeError('Decode error - map field "tags" had too many elements')
              }

              const entry = Peer.Peer$tagsEntry.codec().decode(reader, reader.uint32(), {
                limits: {
                  value: opts.limits?.tags$value
                }
              })
              obj.tags.set(entry.key, entry.value)
              break
            }
            case 8: {
              obj.updated = reader.uint64Number()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const obj = {
          addresses: 0,
          protocols: 0,
          metadata: 0,
          tags: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.addresses != null && obj.addresses === opts.limits.addresses) {
                throw new MaxLengthError('Streaming decode error - repeated field "addresses" had too many elements')
              }

              for (const evt of Address.codec().stream(reader, reader.uint32(), `${prefix}.addresses[]`, {
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
            case 2: {
              if (opts.limits?.protocols != null && obj.protocols === opts.limits.protocols) {
                throw new MaxLengthError('Streaming decode error - repeated field "protocols" had too many elements')
              }

              yield {
                field: `${prefix}.protocols[]`,
                index: obj.protocols,
                value: reader.string()
              }

              obj.protocols++

              break
            }
            case 4: {
              yield {
                field: `${prefix}.publicKey`,
                value: reader.bytes()
              }
              break
            }
            case 5: {
              yield {
                field: `${prefix}.peerRecordEnvelope`,
                value: reader.bytes()
              }
              break
            }
            case 6: {
              if (opts.limits?.metadata != null && obj.metadata === opts.limits.metadata) {
                throw new MaxLengthError('Decode error - map field "metadata" had too many elements')
              }

              yield * Peer.Peer$metadataEntry.codec().stream(reader, reader.uint32(), `${prefix}.metadata{}`, {
                limits: {
                  value: opts.limits?.metadata$value
                }
              })

              obj.metadata++

              break
            }
            case 7: {
              if (opts.limits?.tags != null && obj.tags === opts.limits.tags) {
                throw new MaxLengthError('Decode error - map field "tags" had too many elements')
              }

              yield * Peer.Peer$tagsEntry.codec().stream(reader, reader.uint32(), `${prefix}.tags{}`, {
                limits: {
                  value: opts.limits?.tags$value
                }
              })

              obj.tags++

              break
            }
            case 8: {
              yield {
                field: `${prefix}.updated`,
                value: reader.uint64Number()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface PeerAddressesMultiaddrFieldEvent {
    field: '$.addresses[].multiaddr'
    value: Uint8Array
    index: number
  }

  export interface PeerAddressesIsCertifiedFieldEvent {
    field: '$.addresses[].isCertified'
    value: boolean
    index: number
  }

  export interface PeerAddressesObservedFieldEvent {
    field: '$.addresses[].observed'
    value: number
    index: number
  }

  export interface PeerProtocolsFieldEvent {
    field: '$.protocols[]'
    index: number
    value: string
  }

  export interface PeerPublicKeyFieldEvent {
    field: '$.publicKey'
    value: Uint8Array
  }

  export interface PeerPeerRecordEnvelopeFieldEvent {
    field: '$.peerRecordEnvelope'
    value: Uint8Array
  }

  export interface PeerMetadataFieldEvent {
    field: '$.metadata{}'
    key: string
    value: Uint8Array
  }

  export interface PeerTagsValueFieldEvent {
    field: '$.tags{}.value'
    value: Tag
    key: string
  }

  export interface PeerTagsExpiryFieldEvent {
    field: '$.tags{}.expiry'
    value: Tag
    key: string
  }

  export interface PeerUpdatedFieldEvent {
    field: '$.updated'
    value: number
  }

  export function encode (obj: Partial<Peer>): Uint8Array {
    return encodeMessage(obj, Peer.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer>): Peer {
    return decodeMessage(buf, Peer.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer>): Generator<PeerAddressesMultiaddrFieldEvent | PeerAddressesIsCertifiedFieldEvent | PeerAddressesObservedFieldEvent | PeerProtocolsFieldEvent | PeerPublicKeyFieldEvent | PeerPeerRecordEnvelopeFieldEvent | PeerMetadataFieldEvent | PeerTagsValueFieldEvent | PeerTagsExpiryFieldEvent | PeerUpdatedFieldEvent> {
    return streamMessage(buf, Peer.codec(), opts)
  }
}

export interface Address {
  multiaddr: Uint8Array
  isCertified?: boolean
  observed?: number
}

export namespace Address {
  let _codec: Codec<Address>

  export const codec = (): Codec<Address> => {
    if (_codec == null) {
      _codec = message<Address>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.multiaddr != null && obj.multiaddr.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.multiaddr)
        }

        if (obj.isCertified != null) {
          w.uint32(16)
          w.bool(obj.isCertified)
        }

        if (obj.observed != null) {
          w.uint32(24)
          w.uint64Number(obj.observed)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          multiaddr: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.multiaddr = reader.bytes()
              break
            }
            case 2: {
              obj.isCertified = reader.bool()
              break
            }
            case 3: {
              obj.observed = reader.uint64Number()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.multiaddr`,
                value: reader.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.isCertified`,
                value: reader.bool()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}.observed`,
                value: reader.uint64Number()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface AddressMultiaddrFieldEvent {
    field: '$.multiaddr'
    value: Uint8Array
  }

  export interface AddressIsCertifiedFieldEvent {
    field: '$.isCertified'
    value: boolean
  }

  export interface AddressObservedFieldEvent {
    field: '$.observed'
    value: number
  }

  export function encode (obj: Partial<Address>): Uint8Array {
    return encodeMessage(obj, Address.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Address>): Address {
    return decodeMessage(buf, Address.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Address>): Generator<AddressMultiaddrFieldEvent | AddressIsCertifiedFieldEvent | AddressObservedFieldEvent> {
    return streamMessage(buf, Address.codec(), opts)
  }
}

export interface Tag {
  value: number
  expiry?: bigint
}

export namespace Tag {
  let _codec: Codec<Tag>

  export const codec = (): Codec<Tag> => {
    if (_codec == null) {
      _codec = message<Tag>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.value != null && obj.value !== 0)) {
          w.uint32(8)
          w.uint32(obj.value)
        }

        if (obj.expiry != null) {
          w.uint32(16)
          w.uint64(obj.expiry)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          value: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.value = reader.uint32()
              break
            }
            case 2: {
              obj.expiry = reader.uint64()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.value`,
                value: reader.uint32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.expiry`,
                value: reader.uint64()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface TagValueFieldEvent {
    field: '$.value'
    value: number
  }

  export interface TagExpiryFieldEvent {
    field: '$.expiry'
    value: bigint
  }

  export function encode (obj: Partial<Tag>): Uint8Array {
    return encodeMessage(obj, Tag.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Tag>): Tag {
    return decodeMessage(buf, Tag.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Tag>): Generator<TagValueFieldEvent | TagExpiryFieldEvent> {
    return streamMessage(buf, Tag.codec(), opts)
  }
}

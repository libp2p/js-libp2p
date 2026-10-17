import * as varint from 'uint8-varint'

export interface EncodedPublicKey {
  type: number
  data: Uint8Array
}

/**
 * Reads the Type and Data fields of a `PublicKey` protobuf without decoding
 * the key, returning undefined for anything else
 */
export function decodePublicKeyHeader (buf: Uint8Array): EncodedPublicKey | undefined {
  try {
    if (buf[0] !== 0x08) {
      return
    }

    const type = varint.decode(buf, 1)
    let offset = 1 + varint.encodingLength(type)

    if (buf[offset] !== 0x12) {
      return
    }

    offset++
    const length = varint.decode(buf, offset)
    offset += varint.encodingLength(length)

    if (offset + length !== buf.byteLength) {
      return
    }

    return { type, data: buf.subarray(offset) }
  } catch {}
}

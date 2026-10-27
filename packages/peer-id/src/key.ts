import * as varint from 'uint8-varint'

export interface EncodedPublicKey {
  type: number
  data: Uint8Array
}

/**
 * Reads the Type and Data fields of a `PublicKey` protobuf without decoding
 * the key, returning undefined for anything else. Expects the canonical libp2p
 * encoding (Type then Data, no other fields).
 */
export function decodePublicKeyHeader (buf: Uint8Array): EncodedPublicKey | undefined {
  try {
    if (buf[0] !== 0x08) {
      return
    }

    const type = varint.decode(buf, 1)
    let offset = 1 + canonicalLength(buf, 1, type)

    if (buf[offset] !== 0x12) {
      return
    }

    offset++
    const length = varint.decode(buf, offset)
    offset += canonicalLength(buf, offset, length)

    if (offset + length !== buf.byteLength) {
      return
    }

    return { type, data: buf.subarray(offset) }
  } catch {}
}

/**
 * Returns the length of the varint `value` read at `offset`, throwing if the
 * bytes consumed differ from the canonical encoding
 */
function canonicalLength (buf: Uint8Array, offset: number, value: number): number {
  let consumed = 1

  while (buf[offset + consumed - 1] >= 0x80) {
    consumed++

    if (consumed > 8) {
      break
    }
  }

  if (consumed !== varint.encodingLength(value)) {
    throw new Error('Non-canonical varint')
  }

  return consumed
}

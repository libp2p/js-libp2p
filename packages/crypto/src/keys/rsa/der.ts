interface Context {
  offset: number
}

const TAG_MASK = parseInt('11111', 2)
const LONG_LENGTH_MASK = parseInt('10000000', 2)
const LONG_LENGTH_BYTES_MASK = parseInt('01111111', 2)

interface Decoder {
  (buf: Uint8Array, context: Context): any
}

const decoders: Record<number, Decoder> = {
  2: readInteger,
  3: readBitString,
  5: readNull,
  6: readObjectIdentifier,
  10: readSequence,
  16: readSequence,
  30: readSequence
}

export function decodeDer (buf: Uint8Array, context: Context): any {
  const tag = buf[context.offset] & TAG_MASK
  context.offset++

  if (decoders[tag] != null) {
    return decoders[tag](buf, context)
  }

  throw new Error('No decoder for tag ' + tag)
}

function readLength (buf: Uint8Array, context: Context): number {
  let length = 0

  if ((buf[context.offset] & LONG_LENGTH_MASK) === LONG_LENGTH_MASK) {
    // long length
    const count = buf[context.offset] & LONG_LENGTH_BYTES_MASK
    let str = '0x'
    context.offset++

    for (let i = 0; i < count; i++, context.offset++) {
      str += buf[context.offset].toString(16).padStart(2, '0')
    }

    length = parseInt(str, 16)
  } else {
    length = buf[context.offset]
    context.offset++
  }

  return length
}

function readSequence (buf: Uint8Array, context: Context): any[] {
  readLength(buf, context)
  const entries: any[] = []

  while (true) {
    if (context.offset >= buf.byteLength) {
      break
    }

    const result = decodeDer(buf, context)

    if (result === null) {
      break
    }

    entries.push(result)
  }

  return entries
}

function readInteger (buf: Uint8Array, context: Context): Uint8Array {
  const length = readLength(buf, context)
  const start = context.offset
  const end = context.offset + length

  const nums: number[] = []

  for (let i = start; i < end; i++) {
    if (i === start && buf[i] === 0) {
      continue
    }

    nums.push(buf[i])
  }

  context.offset += length

  return Uint8Array.from(nums)
}

function readObjectIdentifier (buf: Uint8Array, context: Context): string[] {
  const count = readLength(buf, context)

  // skip OID
  context.offset += count

  return ['oid-unimplemented']
}

function readNull (buf: Uint8Array, context: Context): null {
  context.offset++

  return null
}

function readBitString (buf: Uint8Array, context: Context): any {
  const length = readLength(buf, context)
  const unusedBits = buf[context.offset]
  context.offset++
  const bytes = buf.subarray(context.offset, context.offset + length)
  context.offset += length

  if (unusedBits !== 0) {
    // need to shift all bytes along by this many bits
    throw new Error('Unused bits in bitstring is unimplemented')
  }

  return decodeDer(bytes, {
    offset: 0
  })
}

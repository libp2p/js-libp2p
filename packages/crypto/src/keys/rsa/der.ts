import { Uint8ArrayList } from 'uint8arraylist'

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
  0x2: readInteger,
  0x3: readBitString,
  0x5: readNull,
  0x6: readObjectIdentifier,
  0x10: readSequence,
  0x16: readSequence,
  0x30: readSequence
}

export function decodeDer (buf: Uint8Array, context: Context = { offset: 0 }): any {
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

  const vals: number[] = []

  for (let i = start; i < end; i++) {
    if (i === start && buf[i] === 0) {
      continue
    }

    vals.push(buf[i])
  }

  context.offset += length

  return Uint8Array.from(vals)
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
    throw new Error('Unused bits in bit string is unimplemented')
  }

  return decodeDer(bytes, {
    offset: 0
  })
}

function encodeNumber (value: number): Uint8ArrayList {
  let number = value.toString(16)

  if (number.length % 2 === 1) {
    number = '0' + number
  }

  const array = new Uint8ArrayList()

  for (let i = 0; i < number.length; i += 2) {
    array.append(Uint8Array.from([parseInt(`${number[i]}${number[i + 1]}`, 16)]))
  }

  return array
}

function encodeLength (bytes: { byteLength: number }): Uint8Array | Uint8ArrayList {
  if (bytes.byteLength < 128) {
    return Uint8Array.from([bytes.byteLength])
  }

  // long length
  const length = encodeNumber(bytes.byteLength)

  return new Uint8ArrayList(
    Uint8Array.from([
      length.byteLength | LONG_LENGTH_MASK
    ]),
    length
  )
}

export function encodeInteger (value: Uint8Array | Uint8ArrayList): Uint8ArrayList {
  const contents = new Uint8ArrayList()

  const mask = parseInt('10000000', 2)
  const positive = (value.subarray()[0] & mask) === mask

  if (positive) {
    contents.append(Uint8Array.from([0]))
  }

  contents.append(value)

  return new Uint8ArrayList(
    Uint8Array.from([0x02]),
    encodeLength(contents),
    contents
  )
}

export function encodeBitString (value: Uint8Array | Uint8ArrayList): Uint8ArrayList {
  // unused bits is always 0 with full-byte-only values
  const unusedBits = Uint8Array.from([0])

  const contents = new Uint8ArrayList(
    unusedBits,
    value
  )

  return new Uint8ArrayList(
    Uint8Array.from([0x03]),
    encodeLength(contents),
    contents
  )
}

export function encodeSequence (values: Array<Uint8Array | Uint8ArrayList>): Uint8ArrayList {
  const output = new Uint8ArrayList()

  for (const buf of values) {
    output.append(
      buf
    )
  }

  return new Uint8ArrayList(
    Uint8Array.from([0x30]),
    encodeLength(output),
    output
  )
}

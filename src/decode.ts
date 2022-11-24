import { MessageTypeNames, MessageTypes } from './message-types.js'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Source } from 'it-stream-types'
import type { Message } from './message-types.js'

export const MAX_MSG_SIZE = 1 << 20 // 1MB

interface MessageHeader {
  id: number
  type: keyof typeof MessageTypeNames
  offset: number
  length: number
}

class Decoder {
  private readonly _buffer: Uint8ArrayList
  private _headerInfo: MessageHeader | null
  private readonly _maxMessageSize: number

  constructor (maxMessageSize: number = MAX_MSG_SIZE) {
    this._buffer = new Uint8ArrayList()
    this._headerInfo = null
    this._maxMessageSize = maxMessageSize
  }

  write (chunk: Uint8Array) {
    if (chunk == null || chunk.length === 0) {
      return []
    }

    this._buffer.append(chunk)

    if (this._buffer.byteLength > this._maxMessageSize) {
      throw Object.assign(new Error('message size too large!'), { code: 'ERR_MSG_TOO_BIG' })
    }

    const msgs: Message[] = []

    while (this._buffer.length !== 0) {
      if (this._headerInfo == null) {
        try {
          this._headerInfo = this._decodeHeader(this._buffer)
        } catch (_) {
          break // We haven't received enough data yet
        }
      }

      const { id, type, length, offset } = this._headerInfo
      const bufferedDataLength = this._buffer.length - offset

      if (bufferedDataLength < length) {
        break // not enough data yet
      }

      const msg: any = {
        id,
        type
      }

      if (type === MessageTypes.NEW_STREAM || type === MessageTypes.MESSAGE_INITIATOR || type === MessageTypes.MESSAGE_RECEIVER) {
        msg.data = this._buffer.sublist(offset, offset + length)
      }

      msgs.push(msg)

      this._buffer.consume(offset + length)
      this._headerInfo = null
    }

    return msgs
  }

  /**
   * Attempts to decode the message header from the buffer
   */
  _decodeHeader (data: Uint8ArrayList): MessageHeader {
    const {
      value: h,
      offset
    } = readVarInt(data)
    const {
      value: length,
      offset: end
    } = readVarInt(data, offset)

    const type = h & 7

    // @ts-expect-error h is a number not a CODE
    if (MessageTypeNames[type] == null) {
      throw new Error(`Invalid type received: ${type}`)
    }

    // @ts-expect-error h is a number not a CODE
    return { id: h >> 3, type, offset: offset + end, length }
  }
}

const MSB = 0x80
const REST = 0x7F

function readVarInt (buf: Uint8ArrayList, offset: number = 0) {
  let res = 0
  let shift = 0
  let counter = offset
  let b: number
  const l = buf.length

  do {
    if (counter >= l || shift > 49) {
      offset = 0
      throw new RangeError('Could not decode varint')
    }
    b = buf.get(counter++)
    res += shift < 28
      ? (b & REST) << shift
      : (b & REST) * Math.pow(2, shift)
    shift += 7
  } while (b >= MSB)

  offset = counter - offset

  return {
    value: res,
    offset
  }
}

/**
 * Decode a chunk and yield an _array_ of decoded messages
 */
export function decode (maxMessageSize: number = MAX_MSG_SIZE) {
  return async function * decodeMessages (source: Source<Uint8Array>): Source<Message> {
    const decoder = new Decoder(maxMessageSize)

    for await (const chunk of source) {
      const msgs = decoder.write(chunk)

      if (msgs.length > 0) {
        yield * msgs
      }
    }
  }
}

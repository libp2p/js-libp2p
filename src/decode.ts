import { MessageTypeNames, MessageTypes } from './message-types.js'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Message } from './message-types.js'

export const MAX_MSG_SIZE = 1 << 20 // 1MB
export const MAX_MSG_QUEUE_SIZE = 4 << 20 // 4MB

interface MessageHeader {
  id: number
  type: keyof typeof MessageTypeNames
  offset: number
  length: number
}

export class Decoder {
  private readonly _buffer: Uint8ArrayList
  private _headerInfo: MessageHeader | null
  private readonly _maxMessageSize: number
  private readonly _maxUnprocessedMessageQueueSize: number

  constructor (maxMessageSize: number = MAX_MSG_SIZE, maxUnprocessedMessageQueueSize: number = MAX_MSG_QUEUE_SIZE) {
    this._buffer = new Uint8ArrayList()
    this._headerInfo = null
    this._maxMessageSize = maxMessageSize
    this._maxUnprocessedMessageQueueSize = maxUnprocessedMessageQueueSize
  }

  write (chunk: Uint8Array): Message[] {
    if (chunk == null || chunk.length === 0) {
      return []
    }

    this._buffer.append(chunk)

    if (this._buffer.byteLength > this._maxUnprocessedMessageQueueSize) {
      throw Object.assign(new Error('unprocessed message queue size too large!'), { code: 'ERR_MSG_QUEUE_TOO_BIG' })
    }

    const msgs: Message[] = []

    while (this._buffer.length !== 0) {
      if (this._headerInfo == null) {
        try {
          this._headerInfo = this._decodeHeader(this._buffer)
        } catch (err: any) {
          if (err.code === 'ERR_MSG_TOO_BIG') {
            throw err
          }

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

    // test message type varint + data length
    if (length > this._maxMessageSize) {
      throw Object.assign(new Error('message size too large!'), { code: 'ERR_MSG_TOO_BIG' })
    }

    // @ts-expect-error h is a number not a CODE
    return { id: h >> 3, type, offset: offset + end, length }
  }
}

const MSB = 0x80
const REST = 0x7F

export interface ReadVarIntResult {
  value: number
  offset: number
}

function readVarInt (buf: Uint8ArrayList, offset: number = 0): ReadVarIntResult {
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

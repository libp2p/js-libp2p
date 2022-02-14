import varint from 'varint'
import { Message, MessageTypes } from './message-types.js'
import type { Source } from 'it-stream-types'

const POOL_SIZE = 10 * 1024

function allocUnsafe (size: number) {
  if (globalThis.Buffer != null) {
    return Buffer.allocUnsafe(size)
  }

  return new Uint8Array(size)
}

class Encoder {
  private _pool: Uint8Array
  private _poolOffset: number

  constructor () {
    this._pool = allocUnsafe(POOL_SIZE)
    this._poolOffset = 0
  }

  /**
   * Encodes the given message and returns it and its header
   */
  write (msg: Message): Uint8Array[] {
    const pool = this._pool
    let offset = this._poolOffset

    varint.encode(msg.id << 3 | msg.type, pool, offset)
    offset += varint.encode.bytes

    if ((msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) && msg.data != null) {
      varint.encode(msg.data.length, pool, offset)
    } else {
      varint.encode(0, pool, offset)
    }

    offset += varint.encode.bytes

    const header = pool.slice(this._poolOffset, offset)

    if (POOL_SIZE - offset < 100) {
      this._pool = allocUnsafe(POOL_SIZE)
      this._poolOffset = 0
    } else {
      this._poolOffset = offset
    }

    if ((msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) && msg.data != null) {
      return [
        header,
        msg.data instanceof Uint8Array ? msg.data : msg.data.slice()
      ]
    }

    return [
      header
    ]
  }
}

const encoder = new Encoder()

/**
 * Encode and yield one or more messages
 */
export async function * encode (source: Source<Message | Message[]>) {
  for await (const msg of source) {
    if (Array.isArray(msg)) {
      for (const m of msg) {
        yield * encoder.write(m)
      }
    } else {
      yield * encoder.write(msg)
    }
  }
}

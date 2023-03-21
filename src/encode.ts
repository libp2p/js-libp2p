import type { Source } from 'it-stream-types'
import varint from 'varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { allocUnsafe } from './alloc-unsafe.js'
import { Message, MessageTypes } from './message-types.js'
import batchedBytes from 'it-batched-bytes'

const POOL_SIZE = 10 * 1024

class Encoder {
  private _pool: Uint8Array
  private _poolOffset: number

  constructor () {
    this._pool = allocUnsafe(POOL_SIZE)
    this._poolOffset = 0
  }

  /**
   * Encodes the given message and adds it to the passed list
   */
  write (msg: Message, list: Uint8ArrayList): void {
    const pool = this._pool
    let offset = this._poolOffset

    varint.encode(msg.id << 3 | msg.type, pool, offset)
    offset += varint.encode.bytes ?? 0

    if ((msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) && msg.data != null) {
      varint.encode(msg.data.length, pool, offset)
    } else {
      varint.encode(0, pool, offset)
    }

    offset += varint.encode.bytes ?? 0

    const header = pool.subarray(this._poolOffset, offset)

    if (POOL_SIZE - offset < 100) {
      this._pool = allocUnsafe(POOL_SIZE)
      this._poolOffset = 0
    } else {
      this._poolOffset = offset
    }

    list.append(header)

    if ((msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) && msg.data != null) {
      list.append(msg.data)
    }
  }
}

const encoder = new Encoder()

/**
 * Encode and yield one or more messages
 */
export async function * encode (source: Source<Message[]>, minSendBytes: number = 0): AsyncGenerator<Uint8Array, void, undefined> {
  if (minSendBytes == null || minSendBytes === 0) {
    // just send the messages
    for await (const messages of source) {
      const list = new Uint8ArrayList()

      for (const msg of messages) {
        encoder.write(msg, list)
      }

      yield list.subarray()
    }

    return
  }

  // batch messages up for sending
  yield * batchedBytes(source, {
    size: minSendBytes,
    serialize: (obj, list) => {
      for (const m of obj) {
        encoder.write(m, list)
      }
    }
  })
}

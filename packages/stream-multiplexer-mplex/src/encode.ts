import * as varint from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { allocUnsafe } from 'uint8arrays/alloc'
import { MessageTypes } from './message-types.js'
import type { Message } from './message-types.js'
import type { Source } from 'it-stream-types'

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
    offset += varint.encodingLength(msg.id << 3 | msg.type)

    if ((msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) && msg.data != null) {
      varint.encode(msg.data.length, pool, offset)
      offset += varint.encodingLength(msg.data.length)
    } else {
      varint.encode(0, pool, offset)
      offset += varint.encodingLength(0)
    }

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
export async function * encode (source: Source<Message>): AsyncGenerator<Uint8Array | Uint8ArrayList, void, undefined> {
  for await (const message of source) {
    const list = new Uint8ArrayList()
    encoder.write(message, list)
    yield list
  }
}

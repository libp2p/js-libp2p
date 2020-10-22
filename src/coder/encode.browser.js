'use strict'

const varint = require('varint')
const BufferList = require('bl/BufferList')

const POOL_SIZE = 10 * 1024

class Encoder {
  constructor () {
    this._pool = new Uint8Array(POOL_SIZE)
    this._poolOffset = 0
  }

  /**
   * Encodes the given message and returns it and its header
   *
   * @param {*} msg - The message object to encode
   * @returns {Uint8Array|Uint8Array[]}
   */
  write (msg) {
    const pool = this._pool
    let offset = this._poolOffset

    varint.encode(msg.id << 3 | msg.type, pool, offset)
    offset += varint.encode.bytes
    varint.encode(msg.data ? msg.data.length : 0, pool, offset)
    offset += varint.encode.bytes

    const header = pool.subarray(this._poolOffset, offset)

    if (POOL_SIZE - offset < 100) {
      this._pool = new Uint8Array(POOL_SIZE)
      this._poolOffset = 0
    } else {
      this._poolOffset = offset
    }

    if (!msg.data) return header

    return [header, msg.data]
  }
}

const encoder = new Encoder()

// Encode one or more messages and yield a BufferList of encoded messages
module.exports = source => (async function * encode () {
  for await (const msg of source) {
    if (Array.isArray(msg)) {
      yield new BufferList(msg.map(m => encoder.write(m)))
    } else {
      yield new BufferList(encoder.write(msg))
    }
  }
})()

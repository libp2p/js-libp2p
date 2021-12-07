'use strict'

const varint = require('varint')
const BufferList = require('bl/BufferList')

// Decode a chunk and yield an _array_ of decoded messages
module.exports = source => (async function * decode () {
  const decoder = new Decoder()
  for await (const chunk of source) {
    const msgs = decoder.write(chunk)
    if (msgs.length) yield msgs
  }
})()

class Decoder {
  constructor () {
    this._buffer = new BufferList()
    // optimization to allow varint to take a BufferList (well a proxy to)
    this._bufferProxy = new Proxy({}, {
      get: (_, prop) => prop[0] === 'l' ? this._buffer[prop] : this._buffer.get(parseInt(prop))
    })
    this._headerInfo = null
  }

  /**
   * @param {Uint8Array|BufferList} chunk
   * @returns {object[]} An array of message objects
   */
  write (chunk) {
    if (!chunk || !chunk.length) return []

    this._buffer.append(chunk)
    const msgs = []

    while (this._buffer.length) {
      if (!this._headerInfo) {
        try {
          this._headerInfo = this._decodeHeader(this._bufferProxy)
        } catch (_) {
          break // We haven't received enough data yet
        }
      }

      const { id, type, length, offset } = this._headerInfo
      const bufferedDataLength = this._buffer.length - offset

      if (bufferedDataLength < length) break // not enough data yet

      msgs.push({ id, type, data: this._buffer.shallowSlice(offset, offset + length) })

      this._buffer.consume(offset + length)
      this._headerInfo = null
    }

    return msgs
  }

  /**
   * Attempts to decode the message header from the buffer
   *
   * @private
   * @param {Uint8Array} data
   * @returns {*} message header (id, type, offset, length)
   */
  _decodeHeader (data) {
    const h = varint.decode(data)
    let offset = varint.decode.bytes
    const length = varint.decode(data, offset)
    offset += varint.decode.bytes
    return { id: h >> 3, type: h & 7, offset, length }
  }
}

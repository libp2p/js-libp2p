'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit:stream-handler'), {
  error: debug('libp2p:circuit:stream-handler:err')
})

const lp = require('it-length-prefixed')
const handshake = require('it-handshake')
const { CircuitRelay: CircuitPB } = require('../protocol')

class StreamHandler {
  /**
   * Create a stream handler for connection
   *
   * @class
   * @param {object} options
   * @param {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} options.stream - A duplex iterable
   * @param {number} [options.maxLength = 4096] - max bytes length of message
   */
  constructor ({ stream, maxLength = 4096 }) {
    this.stream = stream

    this.shake = handshake(this.stream)
    this.decoder = lp.decode.fromReader(this.shake.reader, { maxDataLength: maxLength })
  }

  /**
   * Read and decode message
   *
   * @async
   * @returns {Promise<CircuitPB>}
   */
  async read () {
    const msg = await this.decoder.next()
    if (msg.value) {
      const value = CircuitPB.decode(msg.value.slice())
      log('read message type', value.type)
      return value
    }

    log('read received no value, closing stream')
    // End the stream, we didn't get data
    this.close()
  }

  /**
   * Encode and write array of buffers
   *
   * @param {CircuitPB} msg - An unencoded CircuitRelay protobuf message
   */
  write (msg) {
    log('write message type %s', msg.type)
    // @ts-ignore lp.encode expects type type 'Buffer | BufferList', not 'Uint8Array'
    this.shake.write(lp.encode.single(CircuitPB.encode(msg)))
  }

  /**
   * Return the handshake rest stream and invalidate handler
   *
   * @returns {*} A duplex iterable
   */
  rest () {
    this.shake.rest()
    return this.shake.stream
  }

  end (msg) {
    this.write(msg)
    this.close()
  }

  /**
   * Close the stream
   *
   * @returns {void}
   */
  close () {
    log('closing the stream')
    this.rest().sink([])
  }
}

module.exports = StreamHandler

'use strict'

const lp = require('it-length-prefixed')
const handshake = require('it-handshake')
const { CircuitRelay: CircuitPB } = require('../protocol')

const debug = require('debug')
const log = debug('libp2p:circuit:stream-handler')
log.error = debug('libp2p:circuit:stream-handler:error')

class StreamHandler {
  /**
   * Create a stream handler for connection
   *
   * @param {object} options
   * @param {*} options.stream - A duplex iterable
   * @param {number} options.maxLength - max bytes length of message
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
   * @returns {void}
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
   * @param {*} msg - An unencoded CircuitRelay protobuf message
   */
  write (msg) {
    log('write message type %s', msg.type)
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

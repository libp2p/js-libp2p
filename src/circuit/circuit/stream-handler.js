'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit:stream-handler'), {
  error: debug('libp2p:circuit:stream-handler:err')
})

const lp = require('it-length-prefixed')
// @ts-ignore it-handshake does not export types
const handshake = require('it-handshake')
const { CircuitRelay } = require('../protocol')

/**
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('../protocol').ICircuitRelay} ICircuitRelay
 */

class StreamHandler {
  /**
   * Create a stream handler for connection
   *
   * @class
   * @param {object} options
   * @param {MuxedStream} options.stream - A duplex iterable
   * @param {number} [options.maxLength = 4096] - max bytes length of message
   */
  constructor ({ stream, maxLength = 4096 }) {
    this.stream = stream

    this.shake = handshake(this.stream)
    // @ts-ignore options are not optional
    this.decoder = lp.decode.fromReader(this.shake.reader, { maxDataLength: maxLength })
  }

  /**
   * Read and decode message
   *
   * @async
   */
  async read () {
    const msg = await this.decoder.next()
    if (msg.value) {
      const value = CircuitRelay.decode(msg.value.slice())
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
   * @param {ICircuitRelay} msg - An unencoded CircuitRelay protobuf message
   * @returns {void}
   */
  write (msg) {
    log('write message type %s', msg.type)
    // @ts-ignore lp.encode expects type type 'Buffer | BufferList', not 'Uint8Array'
    this.shake.write(lp.encode.single(CircuitRelay.encode(msg).finish()))
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

  /**
   * @param {ICircuitRelay} msg - An unencoded CircuitRelay protobuf message
   */
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

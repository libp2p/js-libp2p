'use strict'

const values = require('pull-stream/sources/values')
const collect = require('pull-stream/sinks/collect')
const empty = require('pull-stream/sources/empty')
const pull = require('pull-stream/pull')
const lp = require('pull-length-prefixed')
const handshake = require('pull-handshake')

const debug = require('debug')
const log = debug('libp2p:circuit:stream-handler')
log.err = debug('libp2p:circuit:error:stream-handler')

class StreamHandler {
  /**
   * Create a stream handler for connection
   *
   * @param {Connection} conn - connection to read/write
   * @param {Function|undefined} cb - handshake callback called on error
   * @param {Number} timeout - handshake timeout
   * @param {Number} maxLength - max bytes length of message
   */
  constructor (conn, cb, timeout, maxLength) {
    this.conn = conn
    this.stream = null
    this.shake = null
    this.timeout = cb || 1000 * 60
    this.maxLength = maxLength || 4096

    if (typeof cb === 'function') {
      this.timeout = timeout || 1000 * 60
    }

    this.stream = handshake({ timeout: this.timeout }, cb)
    this.shake = this.stream.handshake

    pull(this.stream, conn, this.stream)
  }

  isValid () {
    return this.conn && this.shake && this.stream
  }

  /**
   * Read and decode message
   *
   * @param {Function} cb
   * @returns {void|Function}
   */
  read (cb) {
    if (!this.isValid()) {
      return cb(new Error('handler is not in a valid state'))
    }

    lp.decodeFromReader(
      this.shake,
      { maxLength: this.maxLength },
      (err, msg) => {
        if (err) {
          log.err(err)
          // this.shake.abort(err)
          return cb(err)
        }

        return cb(null, msg)
      })
  }

  /**
   * Encode and write array of buffers
   *
   * @param {Buffer[]} msg
   * @param {Function} [cb]
   * @returns {Function}
   */
  write (msg, cb) {
    cb = cb || (() => {})

    if (!this.isValid()) {
      return cb(new Error('handler is not in a valid state'))
    }

    pull(
      values([msg]),
      lp.encode(),
      collect((err, encoded) => {
        if (err) {
          log.err(err)
          this.shake.abort(err)
          return cb(err)
        }

        encoded.forEach((e) => this.shake.write(e))
        cb()
      })
    )
  }

  /**
   * Get the raw Connection
   *
   * @returns {null|Connection|*}
   */
  getRawConn () {
    return this.conn
  }

  /**
   * Return the handshake rest stream and invalidate handler
   *
   * @return {*|{source, sink}}
   */
  rest () {
    const rest = this.shake.rest()

    this.conn = null
    this.stream = null
    this.shake = null
    return rest
  }

  /**
   * Close the stream
   *
   * @returns {undefined}
   */
  close () {
    if (!this.isValid()) {
      return
    }

    // close stream
    pull(
      empty(),
      this.rest()
    )
  }
}

module.exports = StreamHandler

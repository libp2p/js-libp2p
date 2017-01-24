'use strict'

const EventEmitter = require('events').EventEmitter
const Connection = require('interface-connection').Connection
const toPull = require('stream-to-pull-stream')
const pull = require('pull-stream')
const pullCatch = require('pull-catch')

const MULTIPLEX_CODEC = require('./multiplex-codec')

module.exports = class MultiplexMuxer extends EventEmitter {
  constructor (conn, multiplex, isListener) {
    super()

    this._id = (isListener ? 0 : -1)

    this.multiplex = multiplex
    this.conn = conn
    this.multicodec = MULTIPLEX_CODEC
    this.isListener = isListener

    multiplex.on('close', () => this.emit('close'))
    multiplex.on('error', (err) => this.emit('error', err))

    multiplex.on('stream', (stream, id) => {
      const muxedConn = new Connection(
        catchError(toPull.duplex(stream)),
        this.conn
      )
      this.emit('stream', muxedConn)
    })
  }

  // method added to enable pure stream muxer feeling
  newStream (callback) {
    callback = callback || noop
    this._id = this._id + 2

    const stream = this.multiplex.createStream(this._id)

    const conn = new Connection(
      catchError(toPull.duplex(stream)),
      this.conn
    )

    setImmediate(() => callback(null, conn))

    return conn
  }

  end (callback) {
    callback = callback || noop
    this.multiplex.once('close', callback)
    this.multiplex.destroy()
  }
}

function noop () {}

// Catch error makes sure that even though we get the "Channel destroyed" error from when closing streams, that it's not leaking through since it's not really an error for us, channels shoul close cleanly.
function catchError (stream) {
  return {
    source: pull(
      stream.source,
      pullCatch((err) => {
        if (err.message === 'Channel destroyed') {
          return
        }
        return false
      })
    ),
    sink: stream.sink
  }
}

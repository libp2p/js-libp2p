'use strict'
/* @flow */

const EventEmitter = require('events').EventEmitter
const stream = require('readable-stream')
const debug = require('debug')

/* :: import type Multiplex from './index'

export type ChannelOpts = {
  chunked?: bool,
  halfOpen?: bool,
  lazy?: bool
}
*/

class Channel extends stream.Duplex {
  constructor (name/* : Buffer | string */, plex/* : Multiplex */, opts/* : ChannelOpts = {} */) {
    const halfOpen = Boolean(opts.halfOpen)
    super({
      allowHalfOpen: halfOpen
    })

    this.name = name
    this.log = debug('mplex:channel:' + this.name.toString())
    this.channel = 0
    this.initiator = false
    this.chunked = Boolean(opts.chunked)
    this.halfOpen = halfOpen
    this.destroyed = false
    this.finalized = false

    this._multiplex = plex
    this._dataHeader = 0
    this._opened = false
    this._awaitDrain = 0
    this._lazy = Boolean(opts.lazy)

    let finished = false
    let ended = false
    this.log('open, halfOpen: ' + this.halfOpen)

    this.once('end', () => {
      this.log('end')
      this._read() // trigger drain

      if (this.destroyed) {
        return
      }

      ended = true
      if (finished) {
        this._finalize()
      } else if (!this.halfOpen) {
        this.end()
      }
    })

    this.once('finish', function onfinish () {
      if (this.destroyed) {
        return
      }

      if (!this._opened) {
        return this.once('open', onfinish)
      }

      if (this._lazy && this.initiator) {
        this._open()
      }

      this._multiplex._send(
        this.channel << 3 | (this.initiator ? 4 : 3),
        null
      )

      finished = true

      if (ended) {
        this._finalize()
      }
    })
  }

  destroy (err/* : Error */) {
    this._destroy(err, true)
  }

  _destroy (err/* : Error */, local/* : bool */) {
    this.log('_destroy:' + (local ? 'local' : 'remote'))
    if (this.destroyed) {
      this.log('already destroyed')
      return
    }

    this.destroyed = true

    const hasErrorListeners = EventEmitter.listenerCount(this, 'error') > 0

    if (err && (!local || hasErrorListeners)) {
      this.emit('error', err)
    }

    this.emit('close')

    if (local && this._opened) {
      if (this._lazy && this.initiator) {
        this._open()
      }

      const msg = err ? new Buffer(err.message) : null
      try {
        this._multiplex._send(
          this.channel << 3 | (this.initiator ? 6 : 5),
          msg
        )
      } catch (e) {}
    }

    this._finalize()
  }

  _finalize () {
    if (this.finalized) {
      return
    }

    this.finalized = true
    this.emit('finalize')
  }

  _write (data/* : Buffer */, enc/* : string */, cb/* : () => void */) {
    this.log('write: ', data.length)
    if (!this._opened) {
      this.once('open', () => {
        this._write(data, enc, cb)
      })
      return
    }

    if (this.destroyed) {
      cb()
      return
    }

    if (this._lazy && this.initiator) {
      this._open()
    }

    const drained = this._multiplex._send(
      this._dataHeader,
      data
    )

    if (drained) {
      cb()
      return
    }

    this._multiplex._ondrain.push(cb)
  }

  _read () {
    if (this._awaitDrain) {
      const drained = this._awaitDrain
      this._awaitDrain = 0
      this._multiplex._onchanneldrain(drained)
    }
  }

  _open () {
    let buf = null
    if (Buffer.isBuffer(this.name)) {
      buf = this.name
    } else if (this.name !== this.channel.toString()) {
      buf = new Buffer(this.name)
    }

    this._lazy = false
    this._multiplex._send(this.channel << 3 | 0, buf)
  }

  open (channel/* : number */, initiator/* : bool */) {
    this.log('open: ' + channel)
    this.channel = channel
    this.initiator = initiator
    this._dataHeader = channel << 3 | (initiator ? 2 : 1)
    this._opened = true
    if (!this._lazy && this.initiator) this._open()
    this.emit('open')
  }
}

module.exports = Channel

'use strict'

const EventEmitter = require('events').EventEmitter
const pull = require('pull-stream/pull')
const empty = require('pull-stream/sources/empty')
const handshake = require('pull-handshake')
const constants = require('./constants')
const util = require('./util')
const rnd = util.rnd
const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

const PROTOCOL = constants.PROTOCOL
const PING_LENGTH = constants.PING_LENGTH

class Ping extends EventEmitter {
  constructor (swarm, peer) {
    super()

    this._stopped = false
    this.peer = peer
    this.swarm = swarm
  }

  start () {
    log('dialing %s to %s', PROTOCOL, this.peer.id.toB58String())

    this.swarm.dial(this.peer, PROTOCOL, (err, conn) => {
      if (err) {
        return this.emit('error', err)
      }

      const stream = handshake({ timeout: 0 })
      this.shake = stream.handshake

      pull(
        stream,
        conn,
        stream
      )

      // write and wait to see ping back
      const self = this
      function next () {
        const start = new Date()
        const buf = rnd(PING_LENGTH)
        self.shake.write(buf)
        self.shake.read(PING_LENGTH, (err, bufBack) => {
          const end = new Date()
          if (err || !buf.equals(bufBack)) {
            const err = new Error('Received wrong ping ack')
            return self.emit('error', err)
          }

          self.emit('ping', end - start)

          if (self._stopped) {
            return
          }
          next()
        })
      }

      next()
    })
  }

  stop () {
    if (this._stopped || !this.shake) {
      return
    }

    this._stopped = true

    pull(
      empty(),
      this.shake.rest()
    )
  }
}

module.exports = Ping

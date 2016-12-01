'use strict'

const EventEmitter = require('events').EventEmitter
const pull = require('pull-stream')
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

    let stop = false
    let shake
    let self = this

    log('dialing %s to %s', PROTOCOL, peer.id.toB58String())

    swarm.dial(peer, PROTOCOL, (err, conn) => {
      if (err) {
        return this.emit('error', err)
      }

      const stream = handshake({ timeout: 0 })
      shake = stream.handshake

      pull(
        stream,
        conn,
        stream
      )

      // write and wait to see ping back
      function next () {
        let start = new Date()
        let buf = rnd(PING_LENGTH)
        shake.write(buf)
        shake.read(PING_LENGTH, (err, bufBack) => {
          let end = new Date()
          if (err || !buf.equals(bufBack)) {
            const err = new Error('Received wrong ping ack')
            return self.emit('error', err)
          }

          self.emit('ping', end - start)

          if (stop) {
            return
          }
          next()
        })
      }

      next()
    })

    this.stop = () => {
      if (stop || !shake) {
        return
      }

      stop = true

      pull(
        pull.empty(),
        shake.rest()
      )
    }
  }
}

module.exports = Ping

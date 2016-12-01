'use strict'

const EventEmitter = require('events').EventEmitter
const pull = require('pull-stream')
const Reader = require('pull-reader')
// const pullHandshake = require('pull-handshake')
const config = require('./config')
const util = require('./util')
const rnd = util.rnd
const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

const PROTOCOL = config.PROTOCOL
const PING_LENGTH = config.PING_LENGTH

class Ping extends EventEmitter {
  constructor (swarm, peer) {
    super()
    this.continue = false

    log('dialing %s to %s', PROTOCOL, peer.id.toB58String())

    swarm.dial(peer, PROTOCOL, (err, conn) => {
      if (err) {
        return this.emit('error', err)
      }

      let start = new Date()

      // buffer creation doesn't memset the buffer to 0
      let buf = rnd(PING_LENGTH)
      let reader = Reader()

      pull(
        pull.values([buf]),
        conn,
        reader)

      const gotBack = (err, bufBack) => {
        let end = new Date()

        if (err || !buf.equals(bufBack)) {
          pull(
            pull.empty(),
            conn
          )
          err = err || new Error('Received wrong ping ack')
          return this.emit('error', err)
        }

        this.emit('ping', end - start)

        if (!this.continue) {
          return pull(
            pull.empty(),
            conn
          )
        }

        start = new Date()
        buf = rnd(PING_LENGTH)

        pull(
          pull.values([buf]),
          reader,
          conn
        )

        reader.read(PING_LENGTH, gotBack)
      }

      reader.read(PING_LENGTH, gotBack)
    })
  }

  stop () {
    this.continue = false
  }
}

module.exports = Ping

'use strict'

const EventEmitter = require('events').EventEmitter
const pull = require('pull-stream')
const Reader = require('pull-reader')
const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

const PROTOCOL = '/ipfs/ping/1.0.0'
const PING_LENGTH = 32

class Ping extends EventEmitter {
  constructor (swarm, peer) {
    super()
    this.cont = true

    log('dialing %s to %s', PROTOCOL, peer.id.toB58String())

    swarm.dial(peer, PROTOCOL, (err, conn) => {
      if (err) {
        log.error(err)
        this.emit('error', err)
        return
      }

      let start = new Date()

      // buffer creation doesn't memset the buffer to 0
      let buf = new Buffer(PING_LENGTH)
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
          this.emit('error', err || new Error('Received wrong ping ack'))
          return
        }

        this.emit('ping', end - start)

        if (!this.cont) {
          pull(
            pull.empty(),
            conn
          )
        }

        start = new Date()
        buf = new Buffer(PING_LENGTH)

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
    this.cont = false
  }
}

function mount (swarm) {
  swarm.handle(PROTOCOL, (protocol, conn) => {
    const reader = Reader()

    pull(
      conn,
      reader
    )

    reader.read(PING_LENGTH, echo)

    function echo (err, buf) {
      if (err) {
        return log.error(err)
      }

      pull(
        pull.values([buf]),
        conn
      )

      reader.read(PING_LENGTH, echo)
    }
  })
}

function unmount (swarm) {
  swarm.unhandle(PROTOCOL)
}

Ping.mount = mount
Ping.unmount = unmount

module.exports = Ping

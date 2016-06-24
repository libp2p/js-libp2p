'use strict'

const EventEmitter = require('events').EventEmitter
const util = require('util')
const read = require('async-buffered-reader')

exports = module.exports = Ping
exports.attach = attach
exports.detach = detach

const PROTOCOL = '/ipfs/ping/1.0.0'

util.inherits(Ping, EventEmitter)

function Ping (swarm, peer) {
  this.cont = true

  swarm.dial(peer, PROTOCOL, (err, conn) => {
    if (err) {
      return this.emit('error', err)
    }

    let start = new Date()
    let buf = new Buffer(32) // buffer creation doesn't memset the buffer to 0

    conn.write(buf)

    const gotBack = (bufBack) => {
      let end = new Date()

      if (buf.equals(bufBack)) {
        this.emit('ping', end - start)
      } else {
        conn.end()
        return this.emit('error', new Error('Received wrong ping ack'))
      }

      if (!this.cont) {
        return conn.end()
      }

      start = new Date()
      buf = new Buffer(32)
      conn.write(buf)
      read(conn, 32, gotBack)
    }

    read(conn, 32, gotBack)
  })

  this.stop = () => {
    this.cont = false
  }
}

function attach (swarm) {
  swarm.handle(PROTOCOL, (conn) => {
    read(conn, 32, echo)

    function echo (buf) {
      conn.write(buf)
      read(conn, 32, echo)
    }

    conn.on('end', () => {
      conn.end()
    })
  })
}

function detach (swarm) {
  swarm.unhandle(PROTOCOL)
}

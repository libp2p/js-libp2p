'use strict'

const pull = require('pull-stream')
const handshake = require('pull-handshake')
const config = require('./config')
const PROTOCOL = config.PROTOCOL
const PING_LENGTH = config.PING_LENGTH

const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

function mount (swarm) {
  swarm.handle(PROTOCOL, (protocol, conn) => {
    const stream = handshake({ timeout: 0 })
    const shake = stream.handshake

    // receive and echo back
    function next () {
      shake.read(PING_LENGTH, (err, buf) => {
        if (err) {
          return log.error(err)
        }

        shake.write(buf)
        next()
      })
    }

    pull(
      conn,
      stream,
      conn
    )

    next()
  })
}

function unmount (swarm) {
  swarm.unhandle(PROTOCOL)
}

exports = module.exports
exports.mount = mount
exports.unmount = unmount

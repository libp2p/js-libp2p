'use strict'

const pull = require('pull-stream/pull')
const handshake = require('pull-handshake')
const constants = require('./constants')
const PROTOCOL = constants.PROTOCOL
const PING_LENGTH = constants.PING_LENGTH

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
        if (err === true) {
          // stream closed
          return
        }
        if (err) {
          return log.error(err)
        }

        shake.write(buf)
        return next()
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

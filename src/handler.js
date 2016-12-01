'use strict'

const pull = require('pull-stream')
const Reader = require('pull-reader')
// const pullHandshake = require('pull-handshake')
const config = require('./config')
const PROTOCOL = config.PROTOCOL
const PING_LENGTH = config.PING_LENGTH

const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

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

exports = module.exports
exports.mount = mount
exports.unmount = unmount

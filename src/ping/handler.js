'use strict'

const pipe = require('it-pipe')
const handshake = require('it-handshake')
const { PROTOCOL } = require('./constants')

const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')

/**
 * Subscribe ping protocol handler.
 * @param {Libp2p} node
 */
function mount (node) {
  node.handle(PROTOCOL, ({ stream }) => {
    const shake = handshake(stream)
    const shakeStream = shake.stream

    // receive and echo back
    const next = async () => {
      const buf = await shake.read()

      shake.write(buf)
      return next()
    }

    pipe(
      stream,
      shakeStream,
      stream
    )

    next()
  })
}

/**
 * Unsubscribe ping protocol handler.
 * @param {Libp2p} node
 */
function unmount (node) {
  node.unhandle(PROTOCOL)
}

exports = module.exports
exports.mount = mount
exports.unmount = unmount

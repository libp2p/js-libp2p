'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:ping'), {
  error: debug('libp2p:ping:err')
})
const errCode = require('err-code')

const crypto = require('libp2p-crypto')
const { pipe } = require('it-pipe')
// @ts-ignore it-buffer has no types exported
const { toBuffer } = require('it-buffer')
const { collect, take } = require('streaming-iterables')
const { equals } = require('uint8arrays/equals')

const { PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION } = require('./constants')

/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */

/**
 * Ping a given peer and wait for its response, getting the operation latency.
 *
 * @param {Libp2p} node
 * @param {PeerId|Multiaddr} peer
 * @returns {Promise<number>}
 */
async function ping (node, peer) {
  const protocol = `/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
  // @ts-ignore multiaddr might not have toB58String
  log('dialing %s to %s', protocol, peer.toB58String ? peer.toB58String() : peer)

  const connection = await node.dial(peer)
  const { stream } = await connection.newStream(protocol)

  const start = Date.now()
  const data = crypto.randomBytes(PING_LENGTH)

  const [result] = await pipe(
    [data],
    stream,
    (/** @type {MuxedStream} */ stream) => take(1, stream),
    toBuffer,
    collect
  )
  const end = Date.now()

  if (!equals(data, result)) {
    throw errCode(new Error('Received wrong ping ack'), 'ERR_WRONG_PING_ACK')
  }

  return end - start
}

/**
 * Subscribe ping protocol handler.
 *
 * @param {Libp2p} node
 */
function mount (node) {
  node.handle(`/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`, ({ stream }) => pipe(stream, stream))
}

/**
 * Unsubscribe ping protocol handler.
 *
 * @param {Libp2p} node
 */
function unmount (node) {
  node.unhandle(`/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`)
}

exports = module.exports = ping
exports.mount = mount
exports.unmount = unmount

'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:fetch'), {
  error: debug('libp2p:fetch:err')
})
const lp = require('it-length-prefixed')
const { FetchRequest, FetchResponse } = require('./proto')
// @ts-ignore it-handshake does not export types
const handshake = require('it-handshake')

const { PROTOCOL_NAME, PROTOCOL_VERSION } = require('./constants')


/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {(key: string) => Promise<Uint8Array | null>} LookupFunction
 */

/**
 * Sends a request to fetch the value associated with the given key from the given peer.
 *
 * @param {Libp2p} node
 * @param {PeerId|Multiaddr} peer
 * @param {string} key
 * @returns {Promise<Uint8Array | null>}
 */
async function fetch (node, peer, key) {
  const protocol = `/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
  // @ts-ignore multiaddr might not have toB58String
  log('dialing %s to %s', protocol, peer.toB58String ? peer.toB58String() : peer)

  const connection = await node.dial(peer)
  const { stream } = await connection.newStream(protocol)
  const shake = handshake(stream)

  // send message
  const request = new FetchRequest({ identifier: key })
  shake.write(lp.encode.single(FetchRequest.encode(request).finish()))

  // read response
  const response = FetchResponse.decode((await lp.decode.fromReader(shake.reader).next()).value.slice())
  switch (response.status) {
    case (FetchResponse.StatusCode.OK): {
      return response.data
    }
    case (FetchResponse.StatusCode.NOT_FOUND): {
      return null
    }
    case (FetchResponse.StatusCode.ERROR): {
      throw new Error('Error in fetch protocol response')
    }
    default: {
      throw new Error('Unreachable case')
    }
  }
}

/**
 * Invoked when a fetch request is received.  Reads the request message off the given stream and
 * responds based on looking up the key in the request via the lookup callback.
 * @param {MuxedStream} stream
 * @param {LookupFunction} lookup
 */
async function handleRequest(stream, lookup) {
  const shake = handshake(stream)
  const request = FetchRequest.decode((await lp.decode.fromReader(shake.reader).next()).value.slice())

  let response
  const data = await lookup(request.identifier)
  if (data) {
    response = new FetchResponse({ status: FetchResponse.StatusCode.OK, data })
  } else {
    response = new FetchResponse({ status: FetchResponse.StatusCode.NOT_FOUND })
  }

  shake.write(lp.encode.single(FetchResponse.encode(response).finish()))
}

/**
 * Subscribe fetch protocol handler. Must be given a lookup function callback that can be used
 * to lookup a value (of type Uint8Array) from a given key (of type string).  The lookup function
 * should return null if the key isn't found.
 *
 * @param {Libp2p} node
 * @param {LookupFunction} lookup
 */
function mount (node, lookup) {
  node.handle(`/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`, ({ stream }) => handleRequest(stream, lookup))
}

/**
 * Unsubscribe fetch protocol handler.
 *
 * @param {Libp2p} node
 */
function unmount (node) {
  node.unhandle(`/${node._config.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`)
}

exports = module.exports = fetch
exports.mount = mount
exports.unmount = unmount

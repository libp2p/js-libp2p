'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:fetch'), {
  error: debug('libp2p:fetch:err')
})
const errCode = require('err-code')
const { codes } = require('../errors')
const lp = require('it-length-prefixed')
const { FetchRequest, FetchResponse } = require('./proto')
// @ts-ignore it-handshake does not export types
const handshake = require('it-handshake')
const { PROTOCOL } = require('./constants')

/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {(key: string) => Promise<Uint8Array | null>} LookupFunction
 */

/**
 * A simple libp2p protocol for requesting a value corresponding to a key from a peer.
 * Developers can register one or more lookup function for retrieving the value corresponding to
 * a given key.  Each lookup function must act on a distinct part of the overall key space, defined
 * by a fixed prefix that all keys that should be routed to that lookup function will start with.
 */
class FetchProtocol {
  /**
   * @param {Libp2p} libp2p
   */
  constructor (libp2p) {
    this._lookupFunctions = new Map() // Maps key prefix to value lookup function
    this._libp2p = libp2p
    this.handleMessage = this.handleMessage.bind(this)
  }

  /**
   * Sends a request to fetch the value associated with the given key from the given peer.
   *
   * @param {PeerId|Multiaddr} peer
   * @param {string} key
   * @returns {Promise<Uint8Array | null>}
   */
  async fetch (peer, key) {
    // @ts-ignore multiaddr might not have toB58String
    log('dialing %s to %s', this._protocol, peer.toB58String ? peer.toB58String() : peer)

    const connection = await this._libp2p.dial(peer)
    const { stream } = await connection.newStream(FetchProtocol.PROTOCOL)
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
        const errmsg = (new TextDecoder()).decode(response.data)
        throw errCode(new Error('Error in fetch protocol response: ' + errmsg), codes.ERR_INVALID_PARAMETERS)
      }
      default: {
        throw errCode(new Error('Unknown response status'), codes.ERR_INVALID_MESSAGE)
      }
    }
  }

  /**
   * Invoked when a fetch request is received.  Reads the request message off the given stream and
   * responds based on looking up the key in the request via the lookup callback that corresponds
   * to the key's prefix.
   *
   * @param {object} options
   * @param {MuxedStream} options.stream
   * @param {string} options.protocol
   */
  async handleMessage (options) {
    const { stream } = options
    const shake = handshake(stream)
    const request = FetchRequest.decode((await lp.decode.fromReader(shake.reader).next()).value.slice())

    let response
    const lookup = this._getLookupFunction(request.identifier)
    if (lookup) {
      const data = await lookup(request.identifier)
      if (data) {
        response = new FetchResponse({ status: FetchResponse.StatusCode.OK, data })
      } else {
        response = new FetchResponse({ status: FetchResponse.StatusCode.NOT_FOUND })
      }
    } else {
      const errmsg = (new TextEncoder()).encode('No lookup function registered for key: ' + request.identifier)
      response = new FetchResponse({ status: FetchResponse.StatusCode.ERROR, data: errmsg })
    }

    shake.write(lp.encode.single(FetchResponse.encode(response).finish()))
  }

  /**
   * Given a key, finds the appropriate function for looking up its corresponding value, based on
   * the key's prefix.
   *
   * @param {string} key
   */
  _getLookupFunction (key) {
    for (const prefix of this._lookupFunctions.keys()) {
      if (key.startsWith(prefix)) {
        return this._lookupFunctions.get(prefix)
      }
    }
    return null
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix.
   *
   * @param {string} prefix
   * @param {LookupFunction} lookup
   */
  registerLookupFunction (prefix, lookup) {
    if (this._lookupFunctions.has(prefix)) {
      throw errCode(new Error("Fetch protocol handler for key prefix '" + prefix + "' already registered"), codes.ERR_KEY_ALREADY_EXISTS)
    }
    this._lookupFunctions.set(prefix, lookup)
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix.
   *
   * @param {string} prefix
   * @param {LookupFunction} [lookup]
   */
  unregisterLookupFunction (prefix, lookup) {
    if (lookup != null) {
      const existingLookup = this._lookupFunctions.get(prefix)

      if (existingLookup !== lookup) {
        return
      }
    }

    this._lookupFunctions.delete(prefix)
  }
}

FetchProtocol.PROTOCOL = PROTOCOL

exports = module.exports = FetchProtocol

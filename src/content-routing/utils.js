'use strict'

const errCode = require('err-code')
const filter = require('it-filter')
const map = require('it-map')
const take = require('it-take')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * Store the multiaddrs from every peer in the passed peer store
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {import('../peer-store')} peerStore
 */
function storeAddresses (source, peerStore) {
  return map(source, (peer) => {
    // ensure we have the addresses for a given peer
    peerStore.addressBook.add(peer.id, peer.multiaddrs)

    return peer
  })
}

/**
 * Filter peers by unique peer id
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 */
function uniquePeers (source) {
  /** @type Set<string> */
  const seen = new Set()

  return filter(source, (peer) => {
    // dedupe by peer id
    if (seen.has(peer.id.toString())) {
      return false
    }

    seen.add(peer.id.toString())

    return true
  })
}

/**
 * Require at least `min` peers to be yielded from `source`
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {number} min
 */
async function * requirePeers (source, min = 1) {
  let seen = 0

  for await (const peer of source) {
    seen++

    yield peer
  }

  if (seen < min) {
    throw errCode(new Error('not found'), 'NOT_FOUND')
  }
}

/**
 * If `max` is passed, only take that number of peers from the source
 * otherwise take all the peers
 *
 * @param {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>} source
 * @param {number} [max]
 */
function maybeLimitSource (source, max) {
  if (max) {
    return take(source, max)
  }

  return source
}

/**
 * Like Promise.race, but only fails if all input promises fail.
 *
 * Returns a promise that will resolve with the value of the first promise
 * to resolve, but will only fail if all promises fail.
 *
 * @template {any} T
 * @param {Promise<T>[]} promises - an array of promises.
 * @returns {Promise<T>} the resolved value of the first promise that succeeded, or an Error if _all_ promises fail.
 */
function raceToSuccess (promises) {
  const combineErrors = (/** @type Error[] */ errors) => {
    if (errors.length === 1) {
      return errors[0]
    }
    return new Error(`${errors.length} operations failed: ` + errors.map(e => e.message).join(', '))
  }

  return Promise.all(promises.map(p => {
    return p.then(
      val => Promise.reject(val),
      err => Promise.resolve(err)
    )
  })).then(
    errors => Promise.reject(combineErrors(errors)),
    val => Promise.resolve(val)
  )
}

module.exports = {
  storeAddresses,
  uniquePeers,
  requirePeers,
  maybeLimitSource,
  raceToSuccess
}

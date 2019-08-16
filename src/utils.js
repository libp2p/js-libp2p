'use strict'

const debug = require('debug')
const multihashing = require('multihashing-async')
const mh = require('multihashes')
const Key = require('interface-datastore').Key
const base32 = require('base32.js')
const distance = require('xor-distance')
const map = require('async/map')
const Record = require('libp2p-record').Record
const setImmediate = require('async/setImmediate')
const PeerId = require('peer-id')
const errcode = require('err-code')

/**
 * Creates a DHT ID by hashing a given buffer.
 *
 * @param {Buffer} buf
 * @param {function(Error, Buffer)} callback
 * @returns {void}
 */
exports.convertBuffer = (buf, callback) => {
  multihashing.digest(buf, 'sha2-256', callback)
}

/**
 * Creates a DHT ID by hashing a Peer ID
 *
 * @param {PeerId} peer
 * @param {function(Error, Buffer)} callback
 * @returns {void}
 */
exports.convertPeerId = (peer, callback) => {
  multihashing.digest(peer.id, 'sha2-256', callback)
}

/**
 * Convert a buffer to their SHA2-256 hash.
 *
 * @param {Buffer} buf
 * @returns {Key}
 */
exports.bufferToKey = (buf) => {
  return new Key('/' + exports.encodeBase32(buf), false)
}

/**
 * Generate the key for a public key.
 *
 * @param {PeerId} peer
 * @returns {Buffer}
 */
exports.keyForPublicKey = (peer) => {
  return Buffer.concat([
    Buffer.from('/pk/'),
    peer.id
  ])
}

exports.isPublicKeyKey = (key) => {
  return key.slice(0, 4).toString() === '/pk/'
}

exports.fromPublicKeyKey = (key) => {
  return new PeerId(key.slice(4))
}

/**
 * Get the current time as timestamp.
 *
 * @returns {number}
 */
exports.now = () => {
  return Date.now()
}

/**
 * Encode a given buffer into a base32 string.
 * @param {Buffer} buf
 * @returns {string}
 */
exports.encodeBase32 = (buf) => {
  const enc = new base32.Encoder()
  return enc.write(buf).finalize()
}

/**
 * Decode a given base32 string into a buffer.
 * @param {string} raw
 * @returns {Buffer}
 */
exports.decodeBase32 = (raw) => {
  const dec = new base32.Decoder()
  return Buffer.from(dec.write(raw).finalize())
}

/**
 * Sort peers by distance to the given `target`.
 *
 * @param {Array<PeerId>} peers
 * @param {Buffer} target
 * @param {function(Error, Array<PeerId>)} callback
 * @returns {void}
 */
exports.sortClosestPeers = (peers, target, callback) => {
  map(peers, (peer, cb) => {
    exports.convertPeerId(peer, (err, id) => {
      if (err) {
        return cb(err)
      }

      cb(null, {
        peer: peer,
        distance: distance(id, target)
      })
    })
  }, (err, distances) => {
    if (err) {
      return callback(err)
    }

    callback(null, distances.sort(exports.xorCompare).map((d) => d.peer))
  })
}

/**
 * Compare function to sort an array of elements which have a distance property which is the xor distance to a given element.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
exports.xorCompare = (a, b) => {
  return distance.compare(a.distance, b.distance)
}

/**
 * Computes how many results to collect on each disjoint path, rounding up.
 * This ensures that we look for at least one result per path.
 *
 * @param {number} resultsWanted
 * @param {number} numPaths - total number of paths
 * @returns {number}
 */
exports.pathSize = (resultsWanted, numPaths) => {
  return Math.ceil(resultsWanted / numPaths)
}

/**
 * Create a new put record, encodes and signs it if enabled.
 *
 * @param {Buffer} key
 * @param {Buffer} value
 * @param {function(Error, Buffer)} callback
 * @returns {void}
 */
exports.createPutRecord = (key, value, callback) => {
  const timeReceived = new Date()
  const rec = new Record(key, value, timeReceived)

  setImmediate(() => {
    callback(null, rec.serialize())
  })
}

/**
 * Creates a logger for the given subsystem
 *
 * @param {PeerId} [id]
 * @param {string} [subsystem]
 * @returns {debug}
 *
 * @private
 */
exports.logger = (id, subsystem) => {
  const name = ['libp2p', 'dht']
  if (subsystem) {
    name.push(subsystem)
  }
  if (id) {
    name.push(`${id.toB58String().slice(0, 8)}`)
  }

  // Add a formatter for converting to a base58 string
  debug.formatters.b = (v) => {
    return mh.toB58String(v)
  }

  const logger = debug(name.join(':'))
  logger.error = debug(name.concat(['error']).join(':'))

  return logger
}

exports.TimeoutError = class TimeoutError extends Error {
  get code () {
    return 'ETIMEDOUT'
  }
}

/**
 * Creates an async function that calls the given `asyncFn` and Errors
 * if it does not resolve within `time` ms
 *
 * @param {Function} [asyncFn]
 * @param {Number} [time]
 * @returns {Function}
 *
 * @private
 */
exports.withTimeout = (asyncFn, time) => {
  return async (...args) => { // eslint-disable-line require-await
    return Promise.race([
      asyncFn(...args),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(errcode(new Error('Async function did not complete before timeout'), 'ETIMEDOUT'))
        }, time)
      })
    ])
  }
}

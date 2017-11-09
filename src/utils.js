'use strict'

const debug = require('debug')
const multihashing = require('multihashing-async')
const Key = require('interface-datastore').Key
const base32 = require('base32.js')
const distance = require('xor-distance')
const map = require('async/map')
const Record = require('libp2p-record').Record
const setImmediate = require('async/setImmediate')
const PeerId = require('peer-id')

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
 * Sort peers by distance to the given `id`.
 *
 * @param {Array<PeerId>} peers
 * @param {Buffer} target
 * @param {function(Error, )} callback
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
 * Create a new put record, encodes and signs it if enabled.
 *
 * @param {Buffer} key
 * @param {Buffer} value
 * @param {PeerId} peer
 * @param {bool} sign - Should the record be signed
 * @param {function(Error, Buffer)} callback
 * @returns {void}
 */
exports.createPutRecord = (key, value, peer, sign, callback) => {
  const rec = new Record(key, value, peer)

  if (sign) {
    return rec.serializeSigned(peer.privKey, callback)
  }

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
  const logger = debug(name.join(':'))
  logger.error = debug(name.concat(['error']).join(':'))

  return logger
}

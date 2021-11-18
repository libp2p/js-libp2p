'use strict'

const debug = require('debug')
const { sha256 } = require('multiformats/hashes/sha2')
const { base58btc } = require('multiformats/bases/base58')
const { base32 } = require('multiformats/bases/base32')
const { Key } = require('interface-datastore/key')
const { Record } = require('libp2p-record')
const PeerId = require('peer-id')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const isPrivateIp = require('private-ip')

// const IPNS_PREFIX = uint8ArrayFromString('/ipns/')
const PK_PREFIX = uint8ArrayFromString('/pk/')

/**
 * @param {import('./types').PeerData} peer
 */
function removePrivateAddresses ({ id, multiaddrs }) {
  return {
    id,
    multiaddrs: multiaddrs.filter(multiaddr => {
      const [[type, addr]] = multiaddr.stringTuples()

      if (type !== 4 && type !== 6) {
        return false
      }

      // @ts-expect-error types are wrong https://github.com/frenchbread/private-ip/issues/18
      return !isPrivateIp(addr)
    })
  }
}

/**
 * @param {import('./types').PeerData} peer
 */
function removePublicAddresses ({ id, multiaddrs }) {
  return {
    id,
    multiaddrs: multiaddrs.filter(multiaddr => {
      const [[type, addr]] = multiaddr.stringTuples()

      if (type !== 4 && type !== 6) {
        return false
      }

      // @ts-expect-error types are wrong https://github.com/frenchbread/private-ip/issues/18
      return isPrivateIp(addr)
    })
  }
}

/**
 * Creates a DHT ID by hashing a given Uint8Array.
 *
 * @param {Uint8Array} buf
 * @returns {Promise<Uint8Array>}
 */
const convertBuffer = async (buf) => {
  return (await sha256.digest(buf)).digest
}

/**
 * Creates a DHT ID by hashing a Peer ID
 *
 * @param {PeerId} peer
 * @returns {Promise<Uint8Array>}
 */
const convertPeerId = async (peer) => {
  return (await sha256.digest(peer.id)).digest
}

/**
 * Convert a Uint8Array to their SHA2-256 hash.
 *
 * @param {Uint8Array} buf
 * @returns {Key}
 */
const bufferToKey = (buf) => {
  return new Key('/' + uint8ArrayToString(buf, 'base32'), false)
}

/**
 * Generate the key for a public key.
 *
 * @param {PeerId} peer
 * @returns {Uint8Array}
 */
const keyForPublicKey = (peer) => {
  return uint8ArrayConcat([
    PK_PREFIX,
    peer.id
  ])
}

/**
 * @param {Uint8Array} key
 */
const isPublicKeyKey = (key) => {
  return uint8ArrayToString(key.slice(0, 4)) === '/pk/'
}

/**
 * @param {Uint8Array} key
 */
const isIPNSKey = (key) => {
  return uint8ArrayToString(key.slice(0, 4)) === '/ipns/'
}

/**
 * @param {Uint8Array} key
 */
const fromPublicKeyKey = (key) => {
  return new PeerId(key.slice(4))
}

/**
 * Create a new put record, encodes and signs it if enabled.
 *
 * @param {Uint8Array} key
 * @param {Uint8Array} value
 * @returns {Uint8Array}
 */
const createPutRecord = (key, value) => {
  const timeReceived = new Date()
  const rec = new Record(key, value, timeReceived)

  return rec.serialize()
}

/**
 * Creates a logger for the given subsystem
 *
 * @param {string} name
 */
const logger = (name) => {
  // Add a formatter for converting to a base58 string
  debug.formatters.b = (v) => {
    return base58btc.baseEncode(v)
  }

  // Add a formatter for converting to a base58 string
  debug.formatters.t = (v) => {
    return base32.baseEncode(v)
  }

  // Add a formatter for stringifying peer ids
  debug.formatters.p = (p) => {
    return p.toB58String()
  }

  const logger = Object.assign(debug(name), {
    error: debug(`${name}:error`)
  })

  return logger
}

module.exports = {
  removePrivateAddresses,
  removePublicAddresses,
  convertBuffer,
  convertPeerId,
  bufferToKey,
  keyForPublicKey,
  isPublicKeyKey,
  isIPNSKey,
  fromPublicKeyKey,
  createPutRecord,
  logger
}

'use strict'

const CID = require('cids')
const multihashing = require('multihashing-async')

const TextEncoder = require('ipfs-utils/src/text-encoder')

/**
 * Convert a namespace string into a cid.
 *
 * @param {string} namespace
 * @returns {Promise<CID>}
 */
module.exports.namespaceToCid = async (namespace) => {
  const bytes = new TextEncoder('utf8').encode(namespace)
  const hash = await multihashing(bytes, 'sha2-256')

  return new CID(hash)
}

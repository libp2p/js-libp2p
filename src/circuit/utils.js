'use strict'

const { CID } = require('multiformats/cid')
const { sha256 } = require('multiformats/hashes/sha2')

/**
 * Convert a namespace string into a cid.
 *
 * @param {string} namespace
 * @returns {Promise<CID>}
 */
module.exports.namespaceToCid = async (namespace) => {
  const bytes = new TextEncoder().encode(namespace)
  const hash = await sha256.digest(bytes)

  return CID.createV0(hash)
}

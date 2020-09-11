'use strict'

const CID = require('cids')
const multihashing = require('multihashing-async')

/**
 * Convert a namespace string into a cid.
 * @param {string} namespace
 * @return {Promise<CID>}
 */
module.exports.namespaceToCid = async (namespace) => {
  const bytes = new TextEncoder('utf8').encode(namespace)
  const hash = await multihashing(bytes, 'sha2-256')

  return new CID(hash)
}

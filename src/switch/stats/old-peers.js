'use strict'

const LRU = require('hashlru')

/**
 * Creates and returns a Least Recently Used Cache
 *
 * @param {Number} maxSize
 * @returns {LRUCache}
 */
function oldPeers (maxSize) {
  const patched = LRU(maxSize)
  patched.delete = patched.remove
  return patched
}
module.exports = oldPeers
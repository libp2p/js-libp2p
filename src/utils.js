'use strict'

const multihashing = require('multihashing')

// Check the equality of two keys
exports.keyEqual = (k1, k2) => {
  return k1.buffer.equals(k2.buffer)
}

// Hashes a key
exports.keyHash = (key) => {
  return multihashing(key.buffer, 'sha2-256')
}

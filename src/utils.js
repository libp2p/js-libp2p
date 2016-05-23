'use strict'

const multihashing = require('multihashing')

// Hashes a key
exports.keyHash = (bytes) => {
  return multihashing(bytes, 'sha2-256')
}

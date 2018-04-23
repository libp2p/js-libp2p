'use strict'

const LRU = require('quick-lru')

/**
 * Creates and returns a Least Recently Used Cache
 *
 * @param {Number} maxSize
 * @returns {LRUCache}
 */
module.exports = (maxSize) => {
  return new LRU({ maxSize: maxSize })
}

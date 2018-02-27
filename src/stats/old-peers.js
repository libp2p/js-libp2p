'use strict'

const LRU = require('quick-lru')

module.exports = (maxSize) => {
  return new LRU({ maxSize: maxSize })
}

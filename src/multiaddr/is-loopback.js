'use strict'

const isLoopbackAddr = require('is-loopback-addr')

/**
 * Check if a given multiaddr is a loopback address.
 *
 * @param {Multiaddr} ma
 * @returns {boolean}
 */
function isLoopback (ma) {
  const { address } = ma.nodeAddress()

  return isLoopbackAddr(address)
}

module.exports = isLoopback

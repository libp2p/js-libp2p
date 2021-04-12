'use strict'

// @ts-ignore is-loopback-addr does not publish types
const isLoopbackAddr = require('is-loopback-addr')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

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

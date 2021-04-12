'use strict'

// @ts-ignore private-ip does not publish types
const isIpPrivate = require('private-ip')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * Check if a given multiaddr has a private address.
 *
 * @param {Multiaddr} ma
 * @returns {boolean}
 */
function isPrivate (ma) {
  const { address } = ma.nodeAddress()

  return isIpPrivate(address)
}

module.exports = isPrivate

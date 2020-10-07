'use strict'

const isIpPrivate = require('private-ip')

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

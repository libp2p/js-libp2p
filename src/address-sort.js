'use strict'

const isPrivate = require('./multiaddr/is-private')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @typedef {Object} Address
 * @property {Multiaddr} multiaddr peer multiaddr.
 * @property {boolean} isCertified obtained from a signed peer record.
 */

/**
 * Compare function for array.sort().
 * This sort aims to move the private adresses to the end of the array.
 * In case of equality, a certified address will come first.
 *
 * @param {Address} a
 * @param {Address} b
 * @returns {number}
 */
function addressesPublicFirstCompareFunction (a, b) {
  const isAPrivate = isPrivate(a.multiaddr)
  const isBPrivate = isPrivate(b.multiaddr)

  if (isAPrivate && !isBPrivate) {
    return 1
  } else if (!isAPrivate && isBPrivate) {
    return -1
  }
  // Check certified?
  if (a.isCertified && !b.isCertified) {
    return -1
  } else if (!a.isCertified && b.isCertified) {
    return 1
  }

  return 0
}

/**
 * Sort given addresses by putting public addresses first.
 * In case of equality, a certified address will come first.
 *
 * @param {Array<Address>} addresses
 * @returns {Array<Address>}
 */
function publicAddressesFirst (addresses) {
  return [...addresses].sort(addressesPublicFirstCompareFunction)
}

module.exports.publicAddressesFirst = publicAddressesFirst

'use strict'

/**
 * Verify if two arrays of non primitive types with the "equals" function are equal.
 * Compatible with multiaddr, peer-id and others.
 *
 * @param {Array<*>} a
 * @param {Array<*>} b
 * @returns {boolean}
 */
function arrayEquals (a, b) {
  return a.length === b.length && b.sort() && a.sort().every((item, index) => b[index].equals(item))
}

module.exports = arrayEquals

'use strict'
const randomBytes = require('iso-random-stream/src/random')

module.exports = function (number) {
  if (!number || typeof number !== 'number') {
    throw new Error('first argument must be a Number bigger than 0')
  }
  return randomBytes(number)
}

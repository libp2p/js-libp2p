'use strict'

const rsa = require('./keys/rsa')

function randomBytes (number) {
  if (!number || typeof number !== 'number') {
    throw new Error('first argument must be a Number bigger than 0')
  }

  return rsa.getRandomValues(new Uint8Array(number))
}

module.exports = randomBytes

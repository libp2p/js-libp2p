'use strict'

const hmac = require('./hmac')
const aes = require('./aes')
const keys = require('./keys')
const rsa = require('./keys/rsa')

exports = module.exports

exports.aes = aes
exports.hmac = hmac
exports.keys = keys

exports.randomBytes = (number) => {
  if (!number || typeof number !== 'number') {
    throw new Error('first argument must be a Number bigger than 0')
  }

  return rsa.getRandomValues(new Uint8Array(number))
}

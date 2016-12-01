'use strict'

const randomBytes = require('random-bytes')
const config = require('./config')

exports = module.exports

exports.rnd = (length) => {
  if (!length) {
    length = config.PING_LENGTH
  }
  return randomBytes.sync(length)
}

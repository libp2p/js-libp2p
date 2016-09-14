'use strict'

const sha1 = require('git-sha1')

exports = module.exports

exports.randomSeqno = () => {
  return sha1((~~(Math.random() * 1e9)).toString(36) + Date.now())
}

exports.msgId = (from, seqno) => {
  return from + seqno
}

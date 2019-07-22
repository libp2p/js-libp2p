'use strict'

const errcode = require('err-code')

module.exports = function (curveTypes, type) {
  if (!curveTypes.includes(type)) {
    const names = curveTypes.join(' / ')
    throw errcode(new Error(`Unknown curve: ${type}. Must be ${names}`), 'ERR_INVALID_CURVE')
  }
}

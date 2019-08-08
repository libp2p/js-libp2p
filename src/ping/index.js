'use strict'

const handler = require('./handler')

exports = module.exports = require('./ping')
exports.mount = handler.mount
exports.unmount = handler.unmount

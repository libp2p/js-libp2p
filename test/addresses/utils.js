'use strict'

const Transport1 = require('libp2p-tcp')
const Transport2 = require('libp2p-websockets')
const mergeOptions = require('merge-options')
const baseOptions = require('../utils/base-options')

module.exports.baseOptions = baseOptions

const AddressesOptions = mergeOptions(baseOptions, {
  modules: {
    transport: [Transport1, Transport2]
  }
})

module.exports.AddressesOptions = AddressesOptions

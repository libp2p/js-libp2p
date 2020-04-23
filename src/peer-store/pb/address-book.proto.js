'use strict'

const protons = require('protons')

/* eslint-disable no-tabs */
const message = `
message Addresses {
  repeated bytes addrs = 1;
}
`

module.exports = protons(message).Addresses

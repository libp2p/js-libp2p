'use strict'

// @ts-ignore protons does not have types
const protons = require('protons')

/* eslint-disable no-tabs */
const message = `
message Protocols {
  repeated string protocols = 1;
}
`

module.exports = protons(message).Protocols

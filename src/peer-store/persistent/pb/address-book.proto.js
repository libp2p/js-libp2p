'use strict'

const protons = require('protons')

const message = `
message Addresses {
  message Address {
    required bytes multiaddr = 1;
  }

  repeated Address addrs = 1;
}
`

module.exports = protons(message).Addresses

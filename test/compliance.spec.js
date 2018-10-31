/* eslint-env mocha */
'use strict'

const tests = require('interface-transport')
const multiaddr = require('multiaddr')
const TCP = require('../src')

describe('interface-transport compliance', () => {
  tests({
    setup (cb) {
      const tcp = new TCP()
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091'),
        multiaddr('/ip4/127.0.0.1/tcp/9092'),
        multiaddr('/ip4/127.0.0.1/tcp/9093'),
        multiaddr('/dns4/ipfs.io')
      ]
      cb(null, tcp, addrs)
    },
    teardown (cb) {
      cb()
    }
  })
})

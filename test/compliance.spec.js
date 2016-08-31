/* eslint-env mocha */
'use strict'

const tests = require('interface-transport')
const multiaddr = require('multiaddr')
const Tcp = require('../src')

describe('compliance', () => {
  tests({
    setup (cb) {
      let tcp = new Tcp()
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091'),
        multiaddr('/ip4/127.0.0.1/tcp/9092'),
        multiaddr('/ip4/127.0.0.1/tcp/9093')
      ]
      cb(null, tcp, addrs)
    },
    teardown (cb) {
      cb()
    }
  })
})

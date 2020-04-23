'use strict'

/* eslint-env mocha */

const tests = require('libp2p-interfaces/src/peer-discovery/tests')

const PeerId = require('peer-id')
const MulticastDNS = require('../src')
let mdns

describe('compliance tests', () => {
  tests({
    async setup () {
      const peerId = await PeerId.create()
      mdns = new MulticastDNS({
        peerId: peerId,
        broadcast: false,
        port: 50001,
        compat: true
      })

      return mdns
    },
    async teardown () {
      // clearInterval(intervalId)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  })
})

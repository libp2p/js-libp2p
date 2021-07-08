'use strict'

/* eslint-env mocha */

const tests = require('libp2p-interfaces-compliance-tests/src/peer-discovery')

const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const MulticastDNS = require('../src')
let mdns

describe('compliance tests', () => {
  let intervalId
  tests({
    async setup () {
      const peerId1 = await PeerId.create()
      const peerId2 = await PeerId.create()

      mdns = new MulticastDNS({
        peerId: peerId1,
        libp2p: {
          multiaddrs: []
        },
        broadcast: false,
        port: 50001,
        compat: true
      })

      // Trigger discovery
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d'
      intervalId = setInterval(() => mdns._onPeer({
        id: peerId2,
        multiaddrs: [new Multiaddr(maStr)]
      }), 1000)

      return mdns
    },
    async teardown () {
      clearInterval(intervalId)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  })
})

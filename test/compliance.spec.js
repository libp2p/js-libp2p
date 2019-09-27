'use strict'

const test = require('interface-discovery')
const PeerInfo = require('peer-info')
const MulticastDNS = require('../src')
let mdns

const common = {
  async setup () {
    const peerInfo = await PeerInfo.create()
    mdns = new MulticastDNS({
      peerInfo,
      broadcast: false,
      port: 50001,
      compat: true
    })

    return mdns
  }
}

// use all of the test suits
test(common)

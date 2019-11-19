'use strict'

const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')

const createPeerInfo = require('./create-peer-info')

const KadDHT = require('../../src')

class TestDHT {
  constructor () {
    this.nodes = []
  }

  spawnConnected (length, options) {

  }

  spawn (length, options = {}) {
    return Promise.all(
      Array.from({ length })
        .map((_, index) => this._spawnOne(index, options))
    )
  }

  async _spawnOne (index, options = {}) {
    // Disable random walk by default for more controlled testing
    options = {
      randomWalk: {
        enabled: false
      },
      ...options
    }

    const [p] = await createPeerInfo(1)
    const port = index !== undefined ? 8000 + index : 0

    p.multiaddrs.add(`/ip4/127.0.0.1/tcp/${port}/p2p/${p.id.toB58String()}`)
    // p.multiaddrs.add(`/ip4/127.0.0.1/tcp/0`)

    const sw = new Switch(p, new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()

    const dht = new KadDHT({
      sw,
      ...options
    })

    dht.validators.v = {
      func (key, publicKey) {
        return Promise.resolve(true)
      },
      sign: false
    }

    dht.validators.v2 = dht.validators.v // added to simulate just validators available

    dht.selectors.v = (k, records) => 0

    await sw.start()
    await dht.start()

    this.nodes.push(dht)
    return dht
  }

  async teardown () {
    await Promise.all(this.nodes.map(async (node) => {
      await node.stop()
      await node.switch.stop()
    }))
    this.nodes = []
  }
}

module.exports = TestDHT

'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const Transport = require('libp2p-tcp')
const { NOISE: Crypto } = require('@chainsafe/libp2p-noise')

const { create } = require('../../src')
const peerUtils = require('../utils/creators/peer')

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('Listening', () => {
  let peerId
  let libp2p

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  after(async () => {
    await libp2p.stop()
  })

  it('should replace wildcard host and port with actual host and port on startup', async () => {
    libp2p = await create({
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    })

    await libp2p.start()

    const addrs = libp2p.transportManager.getAddrs()

    // Should get something like:
    //   /ip4/127.0.0.1/tcp/50866
    //   /ip4/192.168.1.2/tcp/50866
    expect(addrs.length).to.be.at.least(2)
    for (const addr of addrs) {
      const opts = addr.toOptions()
      expect(opts.family).to.equal(4)
      expect(opts.transport).to.equal('tcp')
      expect(opts.host).to.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)
      expect(opts.port).to.be.gt(0)
    }
  })
})

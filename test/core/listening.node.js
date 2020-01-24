'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const multiaddr = require('multiaddr')
const Transport = require('libp2p-tcp')

const { create } = require('../../src')
const peerUtils = require('../utils/creators/peer')

const listenAddr = multiaddr('/ip4/0.0.0.0/tcp/0')

describe('Listening', () => {
  let peerInfo
  let libp2p

  before(async () => {
    [peerInfo] = await peerUtils.createPeerInfo()
    peerInfo.multiaddrs.add(listenAddr)
  })

  after(async () => {
    await libp2p.stop()
  })

  it('should replace wildcard host and port with actual host and port on startup', async () => {
    libp2p = await create({
      peerInfo,
      modules: {
        transport: [Transport]
      }
    })

    await libp2p.start()

    const addrs = libp2p.peerInfo.multiaddrs.toArray()

    // Should get something like:
    //   /ip4/127.0.0.1/tcp/50866
    //   /ip4/192.168.1.2/tcp/50866
    expect(addrs.length).to.be.at.least(2)
    for (const addr of addrs) {
      const opts = addr.toOptions()
      expect(opts.family).to.equal('ipv4')
      expect(opts.transport).to.equal('tcp')
      expect(opts.host).to.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)
      expect(opts.port).to.be.gt(0)
    }
  })
})

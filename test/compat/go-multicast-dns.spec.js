/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const pDefer = require('p-defer')

const GoMulticastDNS = require('../../src/compat')

describe('GoMulticastDNS', () => {
  const peerAddrs = [
    multiaddr('/ip4/127.0.0.1/tcp/20001'),
    multiaddr('/ip4/127.0.0.1/tcp/20002')
  ]
  let peerIds

  before(async () => {
    peerIds = await Promise.all([
      PeerId.create(),
      PeerId.create()
    ])
  })

  it('should start and stop', async () => {
    const mdns = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })

    await mdns.start()
    return mdns.stop()
  })

  it('should ignore multiple start calls', async () => {
    const mdns = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })

    await mdns.start()
    await mdns.start()

    return mdns.stop()
  })

  it('should ignore unnecessary stop calls', async () => {
    const mdns = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })
    await mdns.stop()
  })

  it('should emit peer data when peer is discovered', async () => {
    const mdnsA = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })
    const mdnsB = new GoMulticastDNS({
      peerId: peerIds[1],
      multiaddrs: [peerAddrs[1]]
    })
    const defer = pDefer()

    mdnsA.on('peer', ({ id, multiaddrs }) => {
      if (!id.isEqual(peerIds[1])) return

      expect(multiaddrs.some((m) => m.equals(peerAddrs[1]))).to.be.true()
      defer.resolve()
    })

    // Start in series
    Promise.all([
      mdnsA.start(),
      mdnsB.start()
    ])

    await defer.promise
  })
})

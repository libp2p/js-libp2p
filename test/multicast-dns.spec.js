/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')

const MulticastDNS = require('./../src')

describe('MulticastDNS', () => {
  let pA
  let pB
  let pC
  let pD

  before(async function () {
    this.timeout(80 * 1000)

    ;[pA, pB, pC, pD] = await Promise.all([
      PeerInfo.create(),
      PeerInfo.create(),
      PeerInfo.create(),
      PeerInfo.create()
    ])

    pA.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20001'))

    pB.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20002'))
    pB.multiaddrs.add(multiaddr('/ip6/::1/tcp/20002'))

    pC.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20003'))
    pC.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/30003/ws'))

    pD.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/30003/ws'))
  })

  it('find another peer', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50001,
      compat: false
    })

    const mdnsB = new MulticastDNS({
      peerInfo: pB,
      port: 50001, // port must be the same
      compat: false
    })

    mdnsA.start()
    mdnsB.start()

    const peerInfo = await new Promise((resolve) => mdnsA.once('peer', resolve))

    expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())

    await Promise.all([mdnsA.stop(), mdnsB.stop()])
  })

  it('only announce TCP multiaddrs', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50003,
      compat: false
    })
    const mdnsC = new MulticastDNS({
      peerInfo: pC,
      port: 50003, // port must be the same
      compat: false
    })
    const mdnsD = new MulticastDNS({
      peerInfo: pD,
      port: 50003, // port must be the same
      compat: false
    })

    mdnsA.start()
    mdnsC.start()
    mdnsD.start()

    const peerInfo = await new Promise((resolve) => mdnsA.once('peer', resolve))

    expect(pC.id.toB58String()).to.eql(peerInfo.id.toB58String())
    expect(peerInfo.multiaddrs.size).to.equal(1)

    await Promise.all([
      mdnsA.stop(),
      mdnsC.stop(),
      mdnsD.stop()
    ])
  })

  it('announces IP6 addresses', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50001,
      compat: false
    })

    const mdnsB = new MulticastDNS({
      peerInfo: pB,
      port: 50001,
      compat: false
    })

    mdnsA.start()
    mdnsB.start()

    const peerInfo = await new Promise((resolve) => mdnsA.once('peer', resolve))

    expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
    expect(peerInfo.multiaddrs.size).to.equal(2)

    await Promise.all([mdnsA.stop(), mdnsB.stop()])
  })

  it('doesn\'t emit peers after stop', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      port: 50004, // port must be the same
      compat: false
    })

    const mdnsC = new MulticastDNS({
      peerInfo: pC,
      port: 50004,
      compat: false
    })

    mdnsA.start()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await mdnsA.stop()
    mdnsC.start()

    mdnsC.once('peer', (peerInfo) => {
      throw new Error('Should not receive new peer.')
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))
    await mdnsC.stop()
  })

  it('should start and stop with go-libp2p-mdns compat', async () => {
    const mdns = new MulticastDNS({ peerInfo: pA, port: 50004 })

    await mdns.start()
    await mdns.stop()
  })
})

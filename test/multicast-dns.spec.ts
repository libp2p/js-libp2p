/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import pWaitFor from 'p-wait-for'
import { MulticastDNS } from './../src/index.js'
import { base58btc } from 'multiformats/bases/base58'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PeerData } from '@libp2p/interfaces/peer-data'

describe('MulticastDNS', () => {
  let pA: PeerId
  let aMultiaddrs: Multiaddr[]
  let pB: PeerId
  let bMultiaddrs: Multiaddr[]
  let pC: PeerId
  let cMultiaddrs: Multiaddr[]
  let pD: PeerId
  let dMultiaddrs: Multiaddr[]

  before(async function () {
    this.timeout(80 * 1000)

    ;[pA, pB, pC, pD] = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId(),
      createEd25519PeerId(),
      createEd25519PeerId()
    ])

    aMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/20001'),
      new Multiaddr('/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'),
      new Multiaddr('/dns4/discovery.libp2p.io/tcp/8443')
    ]

    bMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/20002'),
      new Multiaddr('/ip6/::1/tcp/20002'),
      new Multiaddr('/dnsaddr/discovery.libp2p.io')
    ]

    cMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/20003'),
      new Multiaddr('/ip4/127.0.0.1/tcp/30003/ws'),
      new Multiaddr('/dns4/discovery.libp2p.io')
    ]

    dMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/30003/ws')
    ]
  })

  it('find another peer', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      broadcast: false, // do not talk to ourself
      port: 50001,
      compat: false
    })

    const mdnsB = new MulticastDNS({
      peerId: pB,
      multiaddrs: bMultiaddrs,
      port: 50001, // port must be the same
      compat: false
    })

    await mdnsA.start()
    await mdnsB.start()

    const { detail: { id } } = await new Promise<CustomEvent<PeerData>>((resolve) => mdnsA.addEventListener('peer', resolve, {
      once: true
    }))

    expect(pB.toString(base58btc)).to.eql(id.toString(base58btc))

    await Promise.all([mdnsA.stop(), mdnsB.stop()])
  })

  it('only announce TCP multiaddrs', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      broadcast: false, // do not talk to ourself
      port: 50003,
      compat: false
    })
    const mdnsC = new MulticastDNS({
      peerId: pC,
      multiaddrs: cMultiaddrs,
      port: 50003, // port must be the same
      compat: false
    })
    const mdnsD = new MulticastDNS({
      peerId: pD,
      multiaddrs: dMultiaddrs,
      port: 50003, // port must be the same
      compat: false
    })

    await mdnsA.start()
    await mdnsC.start()
    await mdnsD.start()

    const peers = new Map()
    const expectedPeer = pC.toString(base58btc)

    const foundPeer = (evt: CustomEvent<PeerData>) => peers.set(evt.detail.id.toString(base58btc), evt.detail)
    mdnsA.addEventListener('peer', foundPeer)

    await pWaitFor(() => peers.has(expectedPeer))
    mdnsA.removeEventListener('peer', foundPeer)

    expect(peers.get(expectedPeer).multiaddrs.length).to.equal(1)

    await Promise.all([
      mdnsA.stop(),
      mdnsC.stop(),
      mdnsD.stop()
    ])
  })

  it('announces IP6 addresses', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      broadcast: false, // do not talk to ourself
      port: 50001,
      compat: false
    })

    const mdnsB = new MulticastDNS({
      peerId: pB,
      multiaddrs: bMultiaddrs,
      port: 50001,
      compat: false
    })

    await mdnsA.start()
    await mdnsB.start()

    const { detail: { id, multiaddrs } } = await new Promise<CustomEvent<PeerData>>((resolve) => mdnsA.addEventListener('peer', resolve, {
      once: true
    }))

    expect(pB.toString(base58btc)).to.eql(id.toString(base58btc))
    expect(multiaddrs.length).to.equal(2)

    await Promise.all([mdnsA.stop(), mdnsB.stop()])
  })

  it('doesn\'t emit peers after stop', async function () {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      port: 50004, // port must be the same
      compat: false
    })

    const mdnsC = new MulticastDNS({
      peerId: pC,
      multiaddrs: cMultiaddrs,
      port: 50004,
      compat: false
    })

    await mdnsA.start()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await mdnsA.stop()
    await mdnsC.start()

    mdnsC.addEventListener('peer', () => {
      throw new Error('Should not receive new peer.')
    }, {
      once: true
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))
    await mdnsC.stop()
  })

  it('should start and stop with go-libp2p-mdns compat', async () => {
    const mdns = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      port: 50004
    })

    await mdns.start()
    await mdns.stop()
  })

  it('should not emit undefined peer ids', async () => {
    const mdns = new MulticastDNS({
      peerId: pA,
      multiaddrs: aMultiaddrs,
      port: 50004
    })
    await mdns.start()

    await new Promise<void>((resolve, reject) => {
      mdns.addEventListener('peer', (evt) => {
        if (evt.detail == null) {
          reject(new Error('peerData was not set'))
        }
      })

      if (mdns.mdns == null) {
        reject(new Error('mdns property was not set'))
        return
      }

      mdns.mdns.on('response', () => {
        // query.gotResponse is async - we'll bail from that method when
        // comparing the senders PeerId to our own but it'll happen later
        // so allow enough time for the test to have failed if we emit
        // empty peerData objects
        setTimeout(() => {
          resolve()
        }, 100)
      })

      // this will cause us to respond to ourselves
      mdns.mdns.query({
        questions: [{
          name: 'localhost',
          type: 'A'
        }]
      })
    })

    await mdns.stop()
  })
})

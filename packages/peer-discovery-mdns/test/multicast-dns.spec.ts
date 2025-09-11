/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import { stubInterface } from 'sinon-ts'
import { mdns } from './../src/index.js'
import type { MulticastDNSComponents } from './../src/mdns.js'
import type { PeerId, PeerInfo } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

function getComponents (peerId: PeerId, multiaddrs: Multiaddr[]): MulticastDNSComponents {
  const addressManager = stubInterface<AddressManager>()
  addressManager.getAddresses.returns(multiaddrs.map(ma => ma.encapsulate(`/p2p/${peerId.toString()}`)))

  return {
    addressManager,
    logger: defaultLogger()
  }
}

describe('MulticastDNS', () => {
  let pA: PeerId
  let aMultiaddrs: Multiaddr[]
  let pB: PeerId
  let bMultiaddrs: Multiaddr[]
  let cMultiaddrs: Multiaddr[]
  let pD: PeerId
  let dMultiaddrs: Multiaddr[]

  before(async function () {
    this.timeout(80 * 1000)

    ;[pA, pB, pD] = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])

    aMultiaddrs = [
      multiaddr('/ip4/192.168.1.142/tcp/20001'),
      multiaddr('/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'),
      multiaddr('/dns4/discovery.libp2p.io/tcp/8443')
    ]

    bMultiaddrs = [
      multiaddr('/ip4/192.168.1.143/tcp/20002'),
      multiaddr('/ip6/2604:1380:4602:5c00::3/tcp/20002'),
      multiaddr('/dnsaddr/discovery.libp2p.io')
    ]

    cMultiaddrs = [
      multiaddr('/ip4/192.168.1.144/tcp/20003'),
      multiaddr('/ip4/192.168.1.144/tcp/30003/ws'),
      multiaddr('/dns4/discovery.libp2p.io')
    ]

    dMultiaddrs = [
      multiaddr('/ip4/192.168.1.145/tcp/30003/ws')
    ]
  })

  it('find another peer', async function () {
    this.timeout(40 * 1000)

    const mdnsA = mdns({
      broadcast: false, // do not talk to ourself
      port: 50001
    })(getComponents(pA, aMultiaddrs))

    const mdnsB = mdns({
      port: 50001 // port must be the same
    })(getComponents(pB, bMultiaddrs))

    const [
      evt
    ] = await Promise.all([
      pEvent<'peer', CustomEvent<PeerInfo>>(mdnsA, 'peer'),
      start(mdnsA, mdnsB)
    ])

    expect(pB).to.deep.equal(evt.detail.id)

    await stop(mdnsA, mdnsB)
  })

  it('announces all multiaddresses', async function () {
    this.timeout(40 * 1000)

    const mdnsA = mdns({
      broadcast: false, // do not talk to ourself
      port: 50003
    })(getComponents(pA, aMultiaddrs))
    const mdnsB = mdns({
      port: 50003 // port must be the same
    })(getComponents(pB, cMultiaddrs))
    const mdnsD = mdns({
      port: 50003 // port must be the same
    })(getComponents(pD, dMultiaddrs))

    const foundPeer = (evt: CustomEvent<PeerInfo>): Map<string, PeerInfo> => peers.set(evt.detail.id.toString(), evt.detail)
    mdnsA.addEventListener('peer', foundPeer)

    await start(mdnsA, mdnsB, mdnsD)

    const peers = new Map()
    const expectedPeer = pB.toString()

    await pWaitFor(() => peers.has(expectedPeer))
    mdnsA.removeEventListener('peer', foundPeer)

    // everything except loopback
    expect(peers.get(expectedPeer).multiaddrs.length).to.equal(2)

    await stop(mdnsA, mdnsB, mdnsD)
  })

  it('doesn\'t emit peers after stop', async function () {
    this.timeout(40 * 1000)

    const mdnsA = mdns({
      port: 50004 // port must be the same
    })(getComponents(pA, aMultiaddrs))

    const mdnsC = mdns({
      port: 50004
    })(getComponents(pD, dMultiaddrs))

    await start(mdnsA)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await stop(mdnsA)
    await start(mdnsC)

    mdnsC.addEventListener('peer', () => {
      throw new Error('Should not receive new peer.')
    }, {
      once: true
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))
    await stop(mdnsC)
  })

  it('should not emit undefined peer ids', async () => {
    const mdnsA = mdns({
      port: 50004
    })(getComponents(pA, aMultiaddrs))
    await start(mdnsA)

    await new Promise<void>((resolve, reject) => {
      mdnsA.addEventListener('peer', (evt) => {
        if (evt.detail == null) {
          reject(new Error('peerData was not set'))
        }
      })

      // @ts-expect-error not a PeerDiscovery field
      if (mdnsA.mdns == null) {
        reject(new Error('mdns property was not set'))
        return
      }

      // @ts-expect-error not a PeerDiscovery field
      mdnsA.mdns.on('response', () => {
        // query.gotResponse is async - we'll bail from that method when
        // comparing the senders PeerId to our own but it'll happen later
        // so allow enough time for the test to have failed if we emit
        // empty peerData objects
        setTimeout(() => {
          resolve()
        }, 100)
      })

      // this will cause us to respond to ourselves
      // @ts-expect-error not a PeerDiscovery field
      mdnsA.mdns.query({
        questions: [{
          name: 'localhost',
          type: 'A'
        }]
      })
    })

    await stop(mdnsA)
  })

  it('find another peer with different udp4 address', async function () {
    this.timeout(40 * 1000)

    const mdnsA = mdns({
      broadcast: false, // do not talk to ourself
      port: 50005,
      ip: '224.0.0.252'
    })(getComponents(pA, aMultiaddrs))

    const mdnsB = mdns({
      port: 50005, // port must be the same
      ip: '224.0.0.252' // ip must be the same
    })(getComponents(pB, bMultiaddrs))

    const [
      evt
    ] = await Promise.all([
      pEvent<'peer', CustomEvent<PeerInfo>>(mdnsA, 'peer'),
      start(mdnsA, mdnsB)
    ])

    expect(pB).to.deep.equal(evt.detail.id)

    await stop(mdnsA, mdnsB)
  })

  it('only includes link-local addresses', async function () {
    this.timeout(40 * 1000)

    // these are not link-local addresses
    const publicAddress = '/ip4/48.52.76.32/tcp/1234'
    const relayDnsAddress = `/dnsaddr/example.org/tcp/1234/p2p/${pD.toString()}/p2p-circuit`
    const dnsAddress = '/dns4/example.org/tcp/1234'

    // this address is too long to fit in a TXT record
    const longAddress = `/ip4/192.168.1.142/udp/4001/quic-v1/webtransport/certhash/uEiDils3hWFJmsWOJIoMPxAcpzlyFNxTDZpklIoB8643ddw/certhash/uEiAM4BGr4OMK3O9cFGwfbNc4J7XYnsKE5wNPKKaTLa4fkw/p2p/${pD.toString()}/p2p-circuit`

    // these are link-local addresses
    const relayAddress = `/ip4/192.168.1.142/tcp/1234/p2p/${pD.toString()}/p2p-circuit`
    const localAddress = '/ip4/192.168.1.123/tcp/1234'
    const localWsAddress = '/ip4/192.168.1.123/tcp/1234/ws'

    // these are not link-local but go-libp2p advertises loopback addresses even
    // though you shouldn't for mDNS
    const loopbackAddress = '/ip4/127.0.0.1/tcp/1234'
    const loopbackAddress6 = '/ip6/::1/tcp/1234'

    const mdnsA = mdns({
      broadcast: false, // do not talk to ourself
      port: 50005,
      ip: '224.0.0.252'
    })(getComponents(pA, aMultiaddrs))

    const mdnsB = mdns({
      port: 50005, // port must be the same
      ip: '224.0.0.252' // ip must be the same
    })(getComponents(pB, [
      multiaddr(publicAddress),
      multiaddr(relayAddress),
      multiaddr(relayDnsAddress),
      multiaddr(localAddress),
      multiaddr(loopbackAddress),
      multiaddr(loopbackAddress6),
      multiaddr(dnsAddress),
      multiaddr(longAddress),
      multiaddr(localWsAddress)
    ]))

    const [
      evt
    ] = await Promise.all([
      pEvent<'peer', CustomEvent<PeerInfo>>(mdnsA, 'peer'),
      start(mdnsA, mdnsB)
    ])

    expect(pB).to.deep.equal(evt.detail.id)

    ;[
      publicAddress,
      relayDnsAddress,
      dnsAddress,
      longAddress
    ].forEach(addr => {
      expect(evt.detail.multiaddrs.map(ma => ma.toString()))
        .to.not.include(addr)
    })

    ;[
      relayAddress,
      localAddress,
      localWsAddress,
      loopbackAddress,
      loopbackAddress6
    ].forEach(addr => {
      expect(evt.detail.multiaddrs.map(ma => ma.toString()))
        .to.include(addr)
    })

    await stop(mdnsA, mdnsB)
  })
})

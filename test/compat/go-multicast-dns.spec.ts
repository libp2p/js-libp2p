/* eslint-env mocha */
import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import pDefer from 'p-defer'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { GoMulticastDNS } from '../../src/compat/index.js'

describe('GoMulticastDNS', () => {
  const peerAddrs = [
    new Multiaddr('/ip4/127.0.0.1/tcp/20001'),
    new Multiaddr('/ip4/127.0.0.1/tcp/20002')
  ]
  let peerIds: PeerId[]

  before(async () => {
    peerIds = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])
  })

  it('should start and stop', async () => {
    const mdns = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })

    await mdns.start()
    return await mdns.stop()
  })

  it('should ignore multiple start calls', async () => {
    const mdns = new GoMulticastDNS({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })

    await mdns.start()
    await mdns.start()

    return await mdns.stop()
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

    mdnsA.addEventListener('peer', (evt) => {
      const { id, multiaddrs } = evt.detail

      if (!peerIds[1].equals(id)) {
        return
      }

      expect(multiaddrs.some((m) => m.equals(peerAddrs[1]))).to.be.true()
      defer.resolve()
    })

    // Start in series
    void Promise.all([
      mdnsA.start(),
      mdnsB.start()
    ])

    await defer.promise

    await Promise.all([
      mdnsA.stop(),
      mdnsB.stop()
    ])
  })
})

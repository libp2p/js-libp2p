/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import pDefer from 'p-defer'
import { GoMulticastDNS } from '../../src/compat/index.js'
import { stubInterface } from 'ts-sinon'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerInfo } from '@libp2p/interface-peer-info'

let port = 20000

async function createGoMulticastDNS (): Promise<{ mdns: GoMulticastDNS, components: any }> {
  const peerId = await createEd25519PeerId()
  const addressManager = stubInterface<AddressManager>()
  addressManager.getAddresses.returns([
    multiaddr(`/ip4/127.0.0.1/tcp/${port++}/p2p/${peerId.toString()}`),
    multiaddr(`/ip4/127.0.0.1/tcp/${port++}/p2p/${peerId.toString()}`)
  ])

  const components = {
    peerId,
    addressManager
  }

  const mdns = new GoMulticastDNS(components)

  return {
    mdns,
    components
  }
}

describe('GoMulticastDNS', () => {
  it('should start and stop', async () => {
    const { mdns } = await createGoMulticastDNS()

    await mdns.start()
    await mdns.stop()
  })

  it('should ignore multiple start calls', async () => {
    const { mdns } = await createGoMulticastDNS()

    await mdns.start()
    await mdns.start()

    await mdns.stop()
  })

  it('should ignore unnecessary stop calls', async () => {
    const { mdns } = await createGoMulticastDNS()

    await mdns.stop()
  })

  it('should emit peer data when peer is discovered', async () => {
    const { mdns: mdnsA } = await createGoMulticastDNS()
    const { mdns: mdnsB, components: componentsB } = await createGoMulticastDNS()
    const defer = pDefer<PeerInfo>()

    mdnsA.addEventListener('peer', (evt) => {
      const { id } = evt.detail

      if (componentsB.peerId.equals(id) !== true) {
        return
      }

      defer.resolve(evt.detail)
    })

    // Start in series
    await mdnsA.start()
    await mdnsB.start()

    const peerData = await defer.promise

    await Promise.all([
      mdnsA.stop(),
      mdnsB.stop()
    ])

    expect(peerData.id.equals(componentsB.peerId)).to.be.true()
    expect(peerData.multiaddrs.map(ma => ma.toString())).includes(componentsB.addressManager.getAddresses()[1].toString())
  })
})

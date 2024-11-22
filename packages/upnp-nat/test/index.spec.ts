/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { UPnPNAT } from '../src/upnp-nat.js'
import type { UPnPNATInit } from '../src/index.js'
import type { NatAPI } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

interface StubbedUPnPNATComponents {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  addressManager: StubbedInstance<AddressManager>
  events: TypedEventTarget<Libp2pEvents>
}

describe('UPnP NAT (TCP)', () => {
  const teardown: Array<() => Promise<void>> = []
  let client: StubbedInstance<NatAPI>

  async function createNatManager (natManagerOptions: UPnPNATInit = {}): Promise<{ natManager: any, components: StubbedUPnPNATComponents }> {
    const components: StubbedUPnPNATComponents = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      nodeInfo: { name: 'test', version: 'test' },
      logger: defaultLogger(),
      addressManager: stubInterface<AddressManager>(),
      events: new TypedEventEmitter()
    }

    client = stubInterface<NatAPI>()

    const natManager = new UPnPNAT(components, {
      keepAlive: true,
      client,
      ...natManagerOptions
    })

    teardown.push(async () => {
      await stop(natManager)
    })

    return {
      natManager,
      components
    }
  }

  afterEach(async () => {
    await Promise.all(
      teardown.map(async t => {
        await t()
      })
    )
  })

  it('should map TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4002'),
      multiaddr('/ip4/192.168.1.12/tcp/4002')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.true()
    expect(client.map.getCall(0).args[0]).to.equal(4002)
    expect(client.map.getCall(0).args[1]).to.include({
      protocol: 'TCP'
    })
    expect(components.addressManager.addPublicAddressMapping.called).to.be.true()
  })

  it('should map TCP connections to external ports and trust them immediately', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4002'),
      multiaddr('/ip4/192.168.1.12/tcp/4002')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.true()
    expect(client.map.getCall(0).args[0]).to.equal(4002)
    expect(client.map.getCall(0).args[1]).to.include({
      protocol: 'TCP'
    })
    expect(components.addressManager.addPublicAddressMapping.called).to.be.true()
  })

  it('should not map TCP connections when double-natted', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('192.168.1.1')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4002'),
      multiaddr('/ip4/192.168.1.12/tcp/4002')
    ])

    await start(natManager)
    await expect(natManager.mapIpAddresses()).to.eventually.be.rejected
      .with.property('name', 'DoubleNATError')

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should not map non-ipv4 connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip6/fe80::9400:67ff:fe19:2a0f/tcp/0')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should not map non-ipv6 loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip6/::1/tcp/0')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should not map non-TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/192.168.1.12/udp/4001')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should not map loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4001')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should not map non-thin-waist connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4001/sctp/0')
    ])

    await start(natManager)
    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addPublicAddressMapping.called).to.be.false()
  })

  it('should specify large enough TTL', async () => {
    await expect(createNatManager({ ttl: 5, keepAlive: true })).to.eventually.be.rejected
      .with.property('name', 'InvalidParametersError')
  })
})

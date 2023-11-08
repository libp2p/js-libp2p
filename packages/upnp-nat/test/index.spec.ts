/* eslint-env mocha */

import { ERR_INVALID_PARAMETERS } from '@libp2p/interface/errors'
import { stop } from '@libp2p/interface/startable'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { UPnPNAT } from '../src/upnp-nat.js'
import type { NatAPI } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, NodeInfo } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

interface StubbedUPnPNATComponents {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  transportManager: StubbedInstance<TransportManager>
  addressManager: StubbedInstance<AddressManager>
}

describe('UPnP NAT (TCP)', () => {
  const teardown: Array<() => Promise<void>> = []
  let client: StubbedInstance<NatAPI>

  async function createNatManager (natManagerOptions = {}): Promise<{ natManager: any, components: StubbedUPnPNATComponents }> {
    const components: StubbedUPnPNATComponents = {
      peerId: await createEd25519PeerId(),
      nodeInfo: { name: 'test', version: 'test' },
      logger: defaultLogger(),
      addressManager: stubInterface<AddressManager>(),
      transportManager: stubInterface<TransportManager>()
    }

    const natManager = new UPnPNAT(components, {
      keepAlive: true,
      ...natManagerOptions
    })

    client = stubInterface<NatAPI>()

    natManager._getClient = () => {
      return client
    }

    teardown.push(async () => {
      await stop(natManager)
    })

    return {
      natManager,
      components
    }
  }

  afterEach(async () => Promise.all(teardown.map(async t => { await t() })))

  it('should map TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4002'),
      multiaddr('/ip4/192.168.1.12/tcp/4002')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.true()
    expect(client.map.getCall(0).args[0]).to.include({
      localPort: 4002,
      protocol: 'TCP'
    })
    expect(components.addressManager.addObservedAddr.called).to.be.true()
  })

  it('should not map TCP connections when double-natted', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('192.168.1.1')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4002'),
      multiaddr('/ip4/192.168.1.12/tcp/4002')
    ])

    await expect(natManager.mapIpAddresses()).to.eventually.be.rejected
      .with.property('code', 'ERR_DOUBLE_NAT')

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should not map non-ipv4 connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip6/fe80::9400:67ff:fe19:2a0f/tcp/0')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should not map non-ipv6 loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip6/::1/tcp/0')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should not map non-TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip4/192.168.1.12/udp/4001')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should not map loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4001')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should not map non-thin-waist connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('82.3.1.5')

    components.transportManager.getAddrs.returns([
      multiaddr('/ip4/127.0.0.1/tcp/4001/sctp/0')
    ])

    await natManager.mapIpAddresses()

    expect(client.map.called).to.be.false()
    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })

  it('should specify large enough TTL', async () => {
    await expect(createNatManager({ ttl: 5, keepAlive: true })).to.eventually.be.rejected
      .with.property('code', ERR_INVALID_PARAMETERS)
  })
})

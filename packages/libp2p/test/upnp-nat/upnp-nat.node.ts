/* eslint-env mocha */

import { codes } from '@libp2p/interface/errors'
import { EventEmitter } from '@libp2p/interface/events'
import { start, stop } from '@libp2p/interface/startable'
import { FaultTolerance } from '@libp2p/interface/transport'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { uPnPNATService } from '../../src/upnp-nat/index.js'
import type { NatAPI } from '@achingbrain/nat-port-mapper'
import type { PeerUpdate } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerData, PeerStore } from '@libp2p/interface/peer-store'

const DEFAULT_ADDRESSES = [
  '/ip4/127.0.0.1/tcp/0',
  '/ip4/0.0.0.0/tcp/0'
]

describe('UPnP NAT (TCP)', () => {
  const teardown: Array<() => Promise<void>> = []
  let client: StubbedInstance<NatAPI>

  async function createNatManager (addrs = DEFAULT_ADDRESSES, natManagerOptions = {}): Promise<{ natManager: any, components: Components }> {
    const events = new EventEmitter()
    const components: any = defaultComponents({
      peerId: await createEd25519PeerId(),
      upgrader: mockUpgrader({ events }),
      events,
      peerStore: stubInterface<PeerStore>()
    })

    components.peerStore.patch.callsFake(async (peerId: PeerId, details: PeerData) => {
      components.events.safeDispatchEvent('self:peer:update', {
        peer: {
          id: peerId,
          ...details
        }
      })
    })

    components.addressManager = new DefaultAddressManager(components, { listen: addrs })
    components.transportManager = new DefaultTransportManager(components, {
      faultTolerance: FaultTolerance.NO_FATAL
    })

    const natManager: any = uPnPNATService({
      keepAlive: true,
      ...natManagerOptions
    })(components)

    client = stubInterface<NatAPI>()

    natManager._getClient = () => {
      return client
    }

    components.transportManager.add(tcp()())

    await start(components)

    teardown.push(async () => {
      await stop(natManager)
      await components.transportManager.removeAll()
      await stop(components)
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

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    await delay(100)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.not.be.empty()

    const internalPorts = components.transportManager.getAddrs()
      .filter(ma => ma.isThinWaistAddress())
      .map(ma => ma.toOptions())
      .filter(({ host, transport }) => host !== '127.0.0.1' && transport === 'tcp')
      .map(({ port }) => port)

    expect(client.map.called).to.be.true()

    internalPorts.forEach(port => {
      expect(client.map.getCall(0).args[0]).to.include({
        localPort: port,
        protocol: 'TCP'
      })
    })

    const externalAddress = '/ip4/82.3.1.5/tcp/4002'
    const eventPromise = pEvent<'self:peer:update', CustomEvent<PeerUpdate>>(components.events, 'self:peer:update')

    // simulate autonat having run
    components.addressManager.confirmObservedAddr(multiaddr(externalAddress))

    await eventPromise
  })

  it('should not map TCP connections when double-natted', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    client.externalIp.resolves('192.168.1.1')

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await expect(natManager._start()).to.eventually.be.rejectedWith(/double NAT/)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    expect(client.map.called).to.be.false()
  })

  it('should not map non-ipv4 connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip6/::/tcp/0'
    ])

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-ipv6 loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip6/::1/tcp/0'
    ])

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/0.0.0.0/utp'
    ])

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/127.0.0.1/tcp/0'
    ])

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-thin-waist connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/0.0.0.0/tcp/0/sctp/0'
    ])

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

    observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should specify large enough TTL', async () => {
    const peerId = await createEd25519PeerId()

    expect(() => {
      uPnPNATService({ ttl: 5, keepAlive: true })(defaultComponents({ peerId }))
    }).to.throw().with.property('code', codes.ERR_INVALID_PARAMETERS)
  })
})

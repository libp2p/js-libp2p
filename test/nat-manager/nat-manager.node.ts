/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultTransportManager, FaultTolerance } from '../../src/transport-manager.js'
import { tcp } from '@libp2p/tcp'
import { mockUpgrader } from '@libp2p/interface-mocks'
import { NatManager } from '../../src/nat-manager.js'
import delay from 'delay'
import Peers from '../fixtures/peers.js'
import { codes } from '../../src/errors.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import type { NatAPI } from '@achingbrain/nat-port-mapper'
import { StubbedInstance, stubInterface } from 'sinon-ts'
import { start, stop } from '@libp2p/interfaces/startable'
import { DefaultComponents } from '../../src/components.js'

const DEFAULT_ADDRESSES = [
  '/ip4/127.0.0.1/tcp/0',
  '/ip4/0.0.0.0/tcp/0'
]

describe('Nat Manager (TCP)', () => {
  const teardown: Array<() => Promise<void>> = []
  let client: StubbedInstance<NatAPI>

  async function createNatManager (addrs = DEFAULT_ADDRESSES, natManagerOptions = {}): Promise<{ natManager: NatManager, components: DefaultComponents }> {
    const components: any = {
      peerId: await createFromJSON(Peers[0]),
      upgrader: mockUpgrader()
    }
    components.addressManager = new DefaultAddressManager(components, { listen: addrs })
    components.transportManager = new DefaultTransportManager(components, {
      faultTolerance: FaultTolerance.NO_FATAL
    })

    const natManager = new NatManager(components, {
      enabled: true,
      keepAlive: true,
      ...natManagerOptions
    })

    client = stubInterface<NatAPI>()

    natManager._getClient = async () => {
      return client
    }

    components.transportManager.add(tcp()())
    await components.transportManager.listen(components.addressManager.getListenAddrs())

    teardown.push(async () => {
      await stop(natManager)
      await components.transportManager.removeAll()
    })

    return {
      natManager,
      components
    }
  }

  afterEach(async () => await Promise.all(teardown.map(async t => await t())))

  it('should map TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager()

    let addressChangedEventFired = false

    components.addressManager.addEventListener('change:addresses', () => {
      addressChangedEventFired = true
    })

    client.externalIp.resolves('82.3.1.5')

    let observed = components.addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await start(natManager)

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

    expect(addressChangedEventFired).to.be.true()
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

  it('should do nothing when disabled', async () => {
    const {
      natManager
    } = await createNatManager(DEFAULT_ADDRESSES, {
      enabled: false
    })

    await start(natManager)

    await delay(100)

    expect(client.externalIp.called).to.be.false()
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
    const peerId = await createFromJSON(Peers[0])

    expect(() => {
      new NatManager(new DefaultComponents({ peerId }), { ttl: 5, enabled: true, keepAlive: true }) // eslint-disable-line no-new
    }).to.throw().with.property('code', codes.ERR_INVALID_PARAMETERS)
  })
})

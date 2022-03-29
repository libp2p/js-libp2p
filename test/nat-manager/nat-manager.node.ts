/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultTransportManager, FaultTolerance } from '../../src/transport-manager.js'
import { TCP } from '@libp2p/tcp'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { NatManager } from '../../src/nat-manager.js'
import delay from 'delay'
import Peers from '../fixtures/peers.js'
import { codes } from '../../src/errors.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { Components } from '@libp2p/interfaces/components'
import type { NatAPI } from '@achingbrain/nat-port-mapper'
import { StubbedInstance, stubInterface } from 'ts-sinon'

const DEFAULT_ADDRESSES = [
  '/ip4/127.0.0.1/tcp/0',
  '/ip4/0.0.0.0/tcp/0'
]

describe('Nat Manager (TCP)', () => {
  const teardown: Array<() => Promise<void>> = []
  let client: StubbedInstance<NatAPI>

  async function createNatManager (addrs = DEFAULT_ADDRESSES, natManagerOptions = {}) {
    const components = new Components({
      peerId: await createFromJSON(Peers[0]),
      upgrader: mockUpgrader()
    })
    components.setAddressManager(new DefaultAddressManager(components, { listen: addrs }))
    components.setTransportManager(new DefaultTransportManager(components, {
      faultTolerance: FaultTolerance.NO_FATAL
    }))

    const natManager = new NatManager(components, {
      enabled: true,
      keepAlive: true,
      ...natManagerOptions
    })

    client = stubInterface<NatAPI>()

    natManager._getClient = async () => {
      return client
    }

    components.getTransportManager().add(new TCP())
    await components.getTransportManager().listen(components.getAddressManager().getListenAddrs())

    teardown.push(async () => {
      await natManager.stop()
      await components.getTransportManager().removeAll()
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

    components.getAddressManager().addEventListener('change:addresses', () => {
      addressChangedEventFired = true
    })

    client.externalIp.resolves('82.3.1.5')

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.not.be.empty()

    const internalPorts = components.getTransportManager().getAddrs()
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

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await expect(natManager._start()).to.eventually.be.rejectedWith(/double NAT/)

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    expect(client.map.called).to.be.false()
  })

  it('should do nothing when disabled', async () => {
    const {
      natManager
    } = await createNatManager(DEFAULT_ADDRESSES, {
      enabled: false
    })

    natManager.start()

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

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-ipv6 loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip6/::1/tcp/0'
    ])

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-TCP connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/0.0.0.0/utp'
    ])

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map loopback connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/127.0.0.1/tcp/0'
    ])

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-thin-waist connections to external ports', async () => {
    const {
      natManager,
      components
    } = await createNatManager([
      '/ip4/0.0.0.0/tcp/0/sctp/0'
    ])

    let observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = components.getAddressManager().getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should specify large enough TTL', async () => {
    const peerId = await createFromJSON(Peers[0])

    expect(() => {
      // @ts-expect-error invalid parameters
      new NatManager(new Components({ peerId }), { ttl: 5 }) // eslint-disable-line no-new
    }).to.throw().with.property('code', codes.ERR_INVALID_PARAMETERS)
  })
})

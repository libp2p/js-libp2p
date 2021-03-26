'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { networkInterfaces } = require('os')
const AddressManager = require('../../src/address-manager')
const TransportManager = require('../../src/transport-manager')
const Transport = require('libp2p-tcp')
const mockUpgrader = require('../utils/mockUpgrader')
const NatManager = require('../../src/nat-manager')
const delay = require('delay')
const peers = require('../fixtures/peers')
const PeerId = require('peer-id')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

const DEFAULT_ADDRESSES = [
  '/ip4/127.0.0.1/tcp/0',
  '/ip4/0.0.0.0/tcp/0'
]

describe('Nat Manager (TCP)', () => {
  const teardown = []

  async function createNatManager (addrs = DEFAULT_ADDRESSES, natManagerOptions = {}) {
    const peerId = await PeerId.createFromJSON(peers[0])
    const addressManager = new AddressManager(peerId, { listen: addrs })
    const transportManager = new TransportManager({
      libp2p: {
        peerId,
        addressManager,
        peerStore: {
          addressBook: {
            consumePeerRecord: sinon.stub()
          }
        }
      },
      upgrader: mockUpgrader,
      onConnection: () => {},
      faultTolerance: TransportManager.FaultTolerance.NO_FATAL
    })
    const natManager = new NatManager({
      peerId,
      addressManager,
      transportManager,
      enabled: true,
      ...natManagerOptions
    })

    natManager._client = {
      externalIp: sinon.stub().resolves('82.3.1.5'),
      map: sinon.stub(),
      destroy: sinon.stub()
    }

    transportManager.add(Transport.prototype[Symbol.toStringTag], Transport)
    await transportManager.listen(addressManager.getListenAddrs())

    teardown.push(async () => {
      await natManager.stop()
      await transportManager.removeAll()
      expect(transportManager._transports.size).to.equal(0)
    })

    return {
      natManager,
      addressManager,
      transportManager
    }
  }

  afterEach(() => Promise.all(teardown))

  it('should map TCP connections to external ports', async () => {
    const {
      natManager,
      addressManager,
      transportManager
    } = await createNatManager()

    let addressChangedEventFired = false

    addressManager.on('change:addresses', () => {
      addressChangedEventFired = true
    })

    natManager._client = {
      externalIp: sinon.stub().resolves('82.3.1.5'),
      map: sinon.stub(),
      destroy: sinon.stub()
    }

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.not.be.empty()

    const internalPorts = transportManager.getAddrs()
      .filter(ma => ma.isThinWaistAddress())
      .map(ma => ma.toOptions())
      .filter(({ host, transport }) => host !== '127.0.0.1' && transport === 'tcp')
      .map(({ port }) => port)

    expect(natManager._client.map.called).to.be.true()

    internalPorts.forEach(port => {
      expect(natManager._client.map.getCall(0).args[0]).to.include({
        privatePort: port,
        protocol: 'TCP'
      })
    })

    expect(addressChangedEventFired).to.be.true()
  })

  it('should not map TCP connections when double-natted', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager()

    natManager._client.externalIp = sinon.stub().resolves('192.168.1.1')

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await expect(natManager._start()).to.eventually.be.rejectedWith(/double NAT/)

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    expect(natManager._client.map.called).to.be.false()
  })

  it('should do nothing when disabled', async () => {
    const {
      natManager
    } = await createNatManager(DEFAULT_ADDRESSES, {
      enabled: false
    })

    natManager.start()

    await delay(100)

    expect(natManager._client.externalIp.called).to.be.false()
    expect(natManager._client.map.called).to.be.false()
  })

  it('should not map non-ipv4 connections to external ports', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager([
      '/ip6/::/tcp/0'
    ])

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-ipv6 loopback connections to external ports', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager([
      '/ip6/::1/tcp/0'
    ])

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-TCP connections to external ports', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager([
      '/ip4/0.0.0.0/utp'
    ])

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map loopback connections to external ports', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager([
      '/ip4/127.0.0.1/tcp/0'
    ])

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should not map non-thin-waist connections to external ports', async () => {
    const {
      natManager,
      addressManager
    } = await createNatManager([
      '/ip4/0.0.0.0/tcp/0/sctp/0'
    ])

    let observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()

    await natManager._start()

    observed = addressManager.getObservedAddrs().map(ma => ma.toString())
    expect(observed).to.be.empty()
  })

  it('should specify large enough TTL', () => {
    expect(() => {
      new NatManager({ ttl: 5 }) // eslint-disable-line no-new
    }).to.throw().with.property('code', ERR_INVALID_PARAMETERS)
  })

  it('shuts the nat api down when stopping', async function () {
    function findRoutableAddress () {
      const interfaces = networkInterfaces()

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address
          }
        }
      }
    }

    const addr = findRoutableAddress()

    if (!addr) {
      // skip test if no non-loopback address is found
      this.skip()
    }

    const {
      natManager
    } = await createNatManager([
      `/ip4/${addr}/tcp/0`
    ])

    // use the actual nat manager client not the stub
    delete natManager._client

    await natManager._start()

    const client = natManager._client
    expect(client).to.be.ok()

    // ensure the client was stopped
    const spy = sinon.spy(client, 'destroy')

    await natManager.stop()

    expect(spy.called).to.be.true()
  })
})

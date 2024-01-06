/* eslint-env mocha */

import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'
import { peerLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr, resolvers } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { DialQueue } from '../../src/connection-manager/dial-queue.js'
import type { ComponentLogger, Connection, ConnectionGater, PeerId, PeerStore, Transport } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('dial queue', () => {
  let components: {
    peerId: PeerId
    peerStore: StubbedInstance<PeerStore>
    transportManager: StubbedInstance<TransportManager>
    connectionGater: StubbedInstance<ConnectionGater>
    logger: ComponentLogger
  }
  let dialer: DialQueue

  beforeEach(async () => {
    const peerId = await createEd25519PeerId()

    components = {
      peerId,
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      logger: peerLogger(peerId)
    }
  })

  afterEach(() => {
    if (dialer != null) {
      dialer.stop()
    }

    sinon.reset()
  })

  it('should end when a single multiaddr dials succeeds', async () => {
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
    const deferredConn = pDefer<Connection>()
    const actions: Record<string, () => Promise<Connection>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => Promise.reject(new Error('dial failure')),
      '/ip4/127.0.0.1/tcp/1232': async () => Promise.resolve(connection),
      '/ip4/127.0.0.1/tcp/1233': async () => deferredConn.promise
    }

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async ma => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    dialer = new DialQueue(components, {
      maxParallelDials: 2
    })

    // Make sure that dial attempt comes back before terminating last dial action
    await expect(dialer.dial(Object.keys(actions).map(str => multiaddr(str))))
      .to.eventually.equal(connection)

    // End third dial attempt
    deferredConn.resolve()

    // prevent playwright-core error Error: Cannot find parent object page@... to create handle@...
    await expect(deferredConn.promise).to.eventually.be.undefined()
  })

  it('should end when a single multiaddr dials succeeds even when a final dial fails', async () => {
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
    const deferredConn = pDefer<Connection>()
    const actions: Record<string, () => Promise<Connection>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => Promise.reject(new Error('dial failure')),
      '/ip4/127.0.0.1/tcp/1232': async () => Promise.resolve(connection),
      '/ip4/127.0.0.1/tcp/1233': async () => deferredConn.promise
    }

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async ma => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    dialer = new DialQueue(components, {
      maxParallelDials: 2
    })

    // Make sure that dial attempt comes back before terminating last dial action
    await expect(dialer.dial(Object.keys(actions).map(str => multiaddr(str))))
      .to.eventually.equal(connection)

    // End third dial attempt
    deferredConn.reject(new Error('Oh noes!'))

    // prevent playwright-core error Error: Cannot find parent object page@... to create handle@...
    await expect(deferredConn.promise).to.eventually.be.rejected()
  })

  it('should throw an AggregateError if all dials fail', async () => {
    const actions: Record<string, () => Promise<Connection>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => Promise.reject(new Error('dial failure')),
      '/ip4/127.0.0.1/tcp/1232': async () => Promise.reject(new Error('dial failure')),
      '/ip4/127.0.0.1/tcp/1233': async () => Promise.reject(new Error('dial failure'))
    }
    dialer = new DialQueue(components, {
      maxParallelDials: 2
    })

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async ma => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1231')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1232')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1233')

    try {
      await dialer.dial(Object.keys(actions).map(str => multiaddr(str)))
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateCodeError')
    }

    expect(actions['/ip4/127.0.0.1/tcp/1231']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1232']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1233']).to.have.property('callCount', 1)
  })

  it('should handle a large number of addrs', async () => {
    const reject = sinon.stub().callsFake(async () => Promise.reject(new Error('dial failure')))
    const actions: Record<string, () => Promise<Connection>> = {}
    const addrs = [...new Array(25)].map((_, index) => `/ip4/127.0.0.1/tcp/12${index + 1}`)
    addrs.forEach(addr => {
      actions[addr] = reject
    })

    dialer = new DialQueue(components, {
      maxParallelDials: 2
    })

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async ma => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    try {
      await dialer.dial(Object.keys(actions).map(str => multiaddr(str)))
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateCodeError')
    }

    expect(reject).to.have.property('callCount', addrs.length)
  })

  it('should ignore DNS addresses for other peers', async () => {
    const remotePeer = await createEd25519PeerId()
    const otherRemotePeer = await createEd25519PeerId()
    const ma = multiaddr(`/dnsaddr/example.com/p2p/${remotePeer}`)
    const maStr = `/ip4/123.123.123.123/tcp/2348/p2p/${remotePeer}`
    const resolvedAddresses = [
      `/ip4/234.234.234.234/tcp/4213/p2p/${otherRemotePeer}`,
      maStr
    ]

    let resolvedDNSAddrs = false
    let dialedBadAddress = false

    // simulate a DNSAddr that resolves to multiple different peers like
    // bootstrap.libp2p.io
    resolvers.set('dnsaddr', async (addr) => {
      if (addr.equals(ma)) {
        resolvedDNSAddrs = true
        return resolvedAddresses
      }

      return []
    })

    dialer = new DialQueue(components, {
      maxParallelDials: 50
    })
    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())

    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeer))

    components.transportManager.dial.callsFake(async (ma, opts = {}) => {
      if (ma.toString() === maStr) {
        await delay(100)
        return connection
      }

      dialedBadAddress = true
      throw new Error('Could not dial address')
    })

    await expect(dialer.dial(ma)).to.eventually.equal(connection)
    expect(resolvedDNSAddrs).to.be.true('Did not resolve DNSAddrs')
    expect(dialedBadAddress).to.be.false('Dialed address with wrong peer id')

    resolvers.delete('dnsaddr')
  })

  it('should dial WebRTC address with peer id appended', async () => {
    const remotePeer = await createEd25519PeerId()
    const relayPeer = await createEd25519PeerId()
    const ma = multiaddr(`/ip4/123.123.123.123/tcp/123/ws/p2p/${relayPeer}/p2p-circuit/webrtc`)
    const maWithPeer = `${ma}/p2p/${remotePeer}`

    components.transportManager.transportForMultiaddr.callsFake(ma => {
      if (WebRTC.exactMatch(ma)) {
        return stubInterface<Transport>()
      }
    })
    components.peerStore.get.withArgs(remotePeer).resolves({
      id: remotePeer,
      protocols: [],
      metadata: new Map(),
      tags: new Map(),
      addresses: [{
        multiaddr: ma,
        isCertified: true
      }]
    })

    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeer))

    components.transportManager.dial.callsFake(async (ma, opts = {}) => {
      if (ma.toString() === maWithPeer) {
        await delay(100)
        return connection
      }

      throw new Error('Could not dial address')
    })

    dialer = new DialQueue(components)
    await expect(dialer.dial(remotePeer)).to.eventually.equal(connection)
  })
})

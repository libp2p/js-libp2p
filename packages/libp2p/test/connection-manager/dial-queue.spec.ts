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
import type { ComponentLogger } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface/connection'
import type { ConnectionGater } from '@libp2p/interface/connection-gater'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Transport } from '@libp2p/interface/transport'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

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
      expect(err).to.have.property('name', 'AggregateError')
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
      expect(err).to.have.property('name', 'AggregateError')
    }

    expect(reject).to.have.property('callCount', addrs.length)
  })

  it('should abort all dials when its signal is aborted', async () => {
    const signals: Record<string, AbortSignal | undefined> = {}
    const slowDial = async (): Promise<void> => {
      await delay(1000)
    }
    const actions: Record<string, (...args: any[]) => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': slowDial,
      '/ip4/127.0.0.1/tcp/1232': slowDial,
      '/ip4/127.0.0.1/tcp/1233': slowDial
    }
    const controller = new AbortController()

    dialer = new DialQueue(components, {
      maxParallelDials: 2,
      maxParallelDialsPerPeer: 10
    })

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async (ma, options = {}) => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        signals[maStr] = options.signal
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    setTimeout(() => { controller.abort() }, 100)

    await expect(dialer.dial(Object.keys(actions).map(str => multiaddr(str)), {
      signal: controller.signal
    })).to.eventually.be.rejected
      .with.property('name', 'CodeError')

    expect(signals['/ip4/127.0.0.1/tcp/1231']).to.have.property('aborted', true)
    expect(signals['/ip4/127.0.0.1/tcp/1232']).to.have.property('aborted', true)
    expect(signals).to.not.have.property('/ip4/127.0.0.1/tcp/1233') // never dialled as above the maxParallelDials limit
  })

  it('should abort other dials when one succeeds', async () => {
    const remotePeer = await createEd25519PeerId()
    const connection1 = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeer))
    const connection2 = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeer))
    const connection3 = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeer))
    const actions: Record<string, () => Promise<Connection>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => {
        // Slow dial
        await delay(1000)

        return connection1
      },
      '/ip4/127.0.0.1/tcp/1232': async () => {
        // Fast dial
        await delay(10)

        return connection2
      },
      '/ip4/127.0.0.1/tcp/1233': async () => {
        // Slow dial
        await delay(1000)

        return connection3
      }
    }
    const signals: Record<string, AbortSignal> = {}

    components.transportManager.transportForMultiaddr.returns(stubInterface<Transport>())
    components.transportManager.dial.callsFake(async (ma, opts = {}) => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        signals[maStr] = opts.signal
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    dialer = new DialQueue(components, {
      maxParallelDials: 50,
      maxParallelDialsPerPeer: 10
    })

    await expect(dialer.dial(Object.keys(actions).map(str => multiaddr(str)))).to.eventually.equal(connection2)

    // Dial attempt finished without connection
    expect(signals['/ip4/127.0.0.1/tcp/1231']).to.have.property('aborted', true)
    // Dial attempt led to connection
    expect(signals['/ip4/127.0.0.1/tcp/1232']).to.have.property('aborted', false)
    // Dial attempt finished without connection
    expect(signals['/ip4/127.0.0.1/tcp/1233']).to.have.property('aborted', true)
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

/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, KEEP_ALIVE } from '@libp2p/interface'
import { mockConnection, mockDuplex, mockMultiaddrConnection, mockMetrics } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DefaultConnectionManager, type DefaultConnectionManagerComponents } from '../../src/connection-manager/index.js'
import { createBaseOptions } from '../fixtures/base-options.browser.js'
import { createNode } from '../fixtures/creators/peer.js'
import { getComponent } from '../fixtures/get-component.js'
import type { AbortOptions, Connection, ConnectionGater, Libp2p, PeerId, PeerRouting, PeerStore } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

const defaultOptions = {
  maxConnections: 10,
  inboundUpgradeTimeout: 10000
}

function defaultComponents (peerId: PeerId): DefaultConnectionManagerComponents {
  return {
    peerId,
    peerStore: stubInterface<PeerStore>(),
    peerRouting: stubInterface<PeerRouting>(),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: stubInterface<ConnectionGater>(),
    events: new TypedEventEmitter(),
    logger: defaultLogger()
  }
}

describe('Connection Manager', () => {
  let libp2p: Libp2p
  let connectionManager: DefaultConnectionManager

  afterEach(async () => {
    sinon.restore()

    if (connectionManager != null) {
      await connectionManager.stop()
    }

    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should be able to create without metrics', async () => {
    libp2p = await createNode({
      config: createBaseOptions(),
      started: false
    })

    const spy = sinon.spy(getComponent(libp2p, 'connectionManager'), 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.metrics).to.not.exist()
  })

  it('should be able to create with metrics', async () => {
    libp2p = await createNode({
      config: createBaseOptions({
        metrics: mockMetrics()
      }),
      started: false
    })

    const spy = sinon.spy(getComponent(libp2p, 'connectionManager'), 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.metrics).to.exist()
  })

  it('should close connections with low tag values first', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = getComponent(libp2p, 'connectionManager')
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<number, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()

    // wait for prune event
    const eventPromise = pEvent(libp2p, 'connection:prune')

    // Add 1 connection too many
    for (let i = 0; i < max + 1; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIdFromPrivateKey(await generateKeyPair('Ed25519'))))
      const spy = sinon.spy(connection, 'close')

      const value = i * 10
      spies.set(value, spy)
      await libp2p.peerStore.merge(connection.remotePeer, {
        tags: {
          'test-tag': {
            value
          }
        }
      })

      getComponent(libp2p, 'events').safeDispatchEvent('connection:open', { detail: connection })
    }

    await eventPromise

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort((a, b) => {
      if (a > b) {
        return 1
      }

      if (a < b) {
        return -1
      }

      return 0
    })[0]
    const lowestSpy = spies.get(lowest)

    expect(connectionManagerMaybePruneConnectionsSpy.callCount).to.equal(6)
    expect(lowestSpy).to.have.property('callCount', 1)
  })

  it('should close shortest-lived connection if the tag values are equal', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = getComponent(libp2p, 'connectionManager')
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<string, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()
    const eventPromise = pEvent(libp2p, 'connection:prune')

    const createConnection = async (value: number, open: number = Date.now(), peerTag: string = 'test-tag'): Promise<void> => {
      // #TODO: Mock the connection timeline to simulate an older connection
      const connection = mockConnection(mockMultiaddrConnection({ ...mockDuplex(), timeline: { open } }, peerIdFromPrivateKey(await generateKeyPair('Ed25519'))))
      const spy = sinon.spy(connection, 'close')

      // The lowest tag value will have the longest connection
      spies.set(peerTag, spy)
      await libp2p.peerStore.merge(connection.remotePeer, {
        tags: {
          [peerTag]: {
            value
          }
        }
      })

      getComponent(libp2p, 'events').safeDispatchEvent('connection:open', { detail: connection })
    }

    // Create one short of enough connections to initiate pruning
    for (let i = 1; i < max; i++) {
      const value = i * 10
      await createConnection(value)
    }

    const value = 0 * 10
    // Add a connection with the lowest tag value BUT the longest lived connection
    await createConnection(value, 18000, 'longest')
    // Add one more connection with the lowest tag value BUT the shortest-lived connection
    await createConnection(value, Date.now(), 'shortest')

    // wait for prune event
    await eventPromise

    // get the lowest tagged value, but this would be also the longest lived connection
    const longestLivedWithLowestTagSpy = spies.get('longest')

    // Get lowest tagged connection but with a shorter-lived connection
    const shortestLivedWithLowestTagSpy = spies.get('shortest')

    expect(connectionManagerMaybePruneConnectionsSpy.callCount).to.equal(6)
    expect(longestLivedWithLowestTagSpy).to.have.property('callCount', 0)
    expect(shortestLivedWithLowestTagSpy).to.have.property('callCount', 1)
  })

  it('should not close connection that is on the allowlist when pruning', async () => {
    const max = 2
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')

    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max,
          allow: [
            '/ip4/83.13.55.32'
          ]
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = getComponent(libp2p, 'connectionManager')
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<number, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()
    const eventPromise = pEvent(libp2p, 'connection:prune')

    // Max out connections
    for (let i = 0; i < max; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIdFromPrivateKey(await generateKeyPair('Ed25519'))))
      const spy = sinon.spy(connection, 'close')
      const value = (i + 1) * 10
      spies.set(value, spy)
      await libp2p.peerStore.merge(connection.remotePeer, {
        tags: {
          'test-tag': {
            value
          }
        }
      })
      getComponent(libp2p, 'events').safeDispatchEvent('connection:open', { detail: connection })
    }

    // an outbound connection is opened from an address in the allow list
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = mockConnection(mockMultiaddrConnection({
      remoteAddr,
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, remotePeer))

    const value = 0
    const spy = sinon.spy(connection, 'close')
    spies.set(value, spy)

    // Tag that allowed peer with lowest value
    await libp2p.peerStore.merge(connection.remotePeer, {
      tags: {
        'test-tag': {
          value
        }
      }
    })

    getComponent(libp2p, 'events').safeDispatchEvent('connection:open', { detail: connection })

    // wait for prune event
    await eventPromise

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort((a, b) => {
      if (a > b) {
        return 1
      }

      if (a < b) {
        return -1
      }

      return 0
    })[0]
    const lowestSpy = spies.get(lowest)

    expect(connectionManagerMaybePruneConnectionsSpy.callCount).to.equal(3)
    // expect lowest value spy NOT to be called since the peer is in the allow list
    expect(lowestSpy).to.have.property('callCount', 0)
  })

  it('should close connection when the maximum connections has been reached even without tags', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = getComponent(libp2p, 'connectionManager')
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const eventPromise = pEvent(libp2p, 'connection:prune')

    // Add 1 too many connections
    const spy = sinon.spy()
    for (let i = 0; i < max + 1; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIdFromPrivateKey(await generateKeyPair('Ed25519'))))
      sinon.stub(connection, 'close').callsFake(async () => spy()) // eslint-disable-line
      getComponent(libp2p, 'events').safeDispatchEvent('connection:open', { detail: connection })
    }

    // wait for prune event
    await eventPromise

    expect(connectionManagerMaybePruneConnectionsSpy.callCount).to.equal(6)

    expect(spy).to.have.property('callCount', 1)
  })

  it('should fail if the connection manager has mismatched connection limit options', async () => {
    await expect(createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: -1
        }
      }),
      started: false
    })).to.eventually.rejected('maxConnections must be greater')
  })

  it('should reconnect to important peers on startup', async () => {
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    libp2p = await createNode({
      config: createBaseOptions(),
      started: false
    })

    const connectionManager = getComponent(libp2p, 'connectionManager')
    const connectionManagerOpenConnectionSpy = sinon.spy(connectionManager, 'openConnection')

    await libp2p.start()

    expect(connectionManagerOpenConnectionSpy.called).to.be.false('Attempted to connect to peers')

    await libp2p.peerStore.merge(peerId, {
      tags: {
        [KEEP_ALIVE]: {}
      }
    })

    await libp2p.stop()
    await libp2p.start()

    await pWaitFor(() => connectionManagerOpenConnectionSpy.called, {
      interval: 100
    })

    expect(connectionManagerOpenConnectionSpy.called).to.be.true('Did not attempt to connect to important peer')
    expect(connectionManagerOpenConnectionSpy.getCall(0).args[0].toString()).to.equal(peerId.toString(), 'Attempted to connect to the wrong peer')
  })

  it('should deny connections from denylist multiaddrs', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      deny: [
        '/ip4/83.13.55.32'
      ]
    })
    await connectionManager.start()

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const maConn = mockMultiaddrConnection({
      remoteAddr,
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections when maxConnections is exceeded', async () => {
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxConnections: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    }))

    // max out the connection limit
    await connectionManager.openConnection(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const maConn = mockMultiaddrConnection({
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections from peers that connect too frequently', async () => {
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      inboundConnectionThreshold: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>())

    // an inbound connection is opened
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const maConn = mockMultiaddrConnection({
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {},
      // has to be thin waist, which it will be since we've not done the peer id handshake
      // yet in the code being exercised by this test
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001')
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()

    // connect again within a second
    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should allow connections from allowlist multiaddrs', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip4/83.13.55.32'
      ]
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    }))

    // max out the connection limit
    await connectionManager.openConnection(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened from an address in the allow list
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const maConn = mockMultiaddrConnection({
      remoteAddr,
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()
  })

  it('should limit the number of inbound pending connections', async () => {
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    }))

    // start the upgrade
    const maConn1 = mockMultiaddrConnection({
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, peerIdFromPrivateKey(await generateKeyPair('Ed25519')))

    await expect(connectionManager.acceptIncomingConnection(maConn1))
      .to.eventually.be.true()

    // start the upgrade
    const maConn2 = mockMultiaddrConnection({
      source: (async function * () {
        yield * []
      })(),
      sink: async () => {}
    }, peerIdFromPrivateKey(await generateKeyPair('Ed25519')))

    // should be false because we have not completed the upgrade of maConn1
    await expect(connectionManager.acceptIncomingConnection(maConn2))
      .to.eventually.be.false()

    // finish the maConn1 pending upgrade
    connectionManager.afterUpgradeInbound()

    // should be true because we have now completed the upgrade of maConn1
    await expect(connectionManager.acceptIncomingConnection(maConn2))
      .to.eventually.be.true()
  })

  it('should allow dialing peers when an existing limited connection exists', async () => {
    connectionManager = new DefaultConnectionManager(defaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })
    await connectionManager.start()

    const targetPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const addr = multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${targetPeer}`)

    const existingConnection = stubInterface<Connection>({
      limits: {
        bytes: 100n
      }
    })
    const newConnection = stubInterface<Connection>({
      remotePeer: targetPeer
    })

    sinon.stub(connectionManager.dialQueue, 'dial')
      .withArgs(addr)
      .resolves(newConnection)

    // we have an existing limited connection
    const map = connectionManager.getConnectionsMap()
    map.set(targetPeer, [
      existingConnection
    ])

    const conn = await connectionManager.openConnection(addr)

    expect(conn).to.equal(newConnection)
  })
})

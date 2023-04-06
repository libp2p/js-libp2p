/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createNode } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection, mockMetrics } from '@libp2p/interface-mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { CustomEvent } from '@libp2p/interfaces/events'
import { KEEP_ALIVE } from '@libp2p/interface-peer-store/tags'
import pWaitFor from 'p-wait-for'
import { multiaddr, MultiaddrFilter } from '@multiformats/multiaddr'
import { stubInterface } from 'sinon-ts'
import type { Connection } from '@libp2p/interface-connection'
import type { TransportManager, Upgrader } from '@libp2p/interface-transport'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import { pEvent } from 'p-event'

const defaultOptions = {
  maxConnections: 10,
  minConnections: 1,
  autoDialInterval: Infinity,
  inboundUpgradeTimeout: 10000
}

describe('Connection Manager', () => {
  let libp2p: Libp2pNode

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should be able to create without metrics', async () => {
    libp2p = await createNode({
      config: createBaseOptions(),
      started: false
    })

    const spy = sinon.spy(libp2p.connectionManager as DefaultConnectionManager, 'start')

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

    const spy = sinon.spy(libp2p.connectionManager as DefaultConnectionManager, 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.metrics).to.exist()
  })

  it('should close connections with low tag values first', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max,
          minConnections: 2
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.connectionManager as DefaultConnectionManager
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<number, sinon.SinonSpy<[], Promise<void>>>()

    // Add 1 connection too many
    for (let i = 0; i < max + 1; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      const spy = sinon.spy(connection, 'close')

      const value = i * 10
      spies.set(value, spy)
      await libp2p.peerStore.tagPeer(connection.remotePeer, 'test-tag', {
        value
      })

      await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))
    }

    // wait for prune event
    await pEvent(connectionManager, 'peer:prune')

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
          maxConnections: max,
          minConnections: 2
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.connectionManager as DefaultConnectionManager
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<string, sinon.SinonSpy<[], Promise<void>>>()

    const createConnection = async (value: number, open: number = Date.now(), peerTag: string = 'test-tag'): Promise<void> => {
      // #TODO: Mock the connection timeline to simulate an older connection
      const connection = mockConnection(mockMultiaddrConnection({ ...mockDuplex(), timeline: { open } }, await createEd25519PeerId()))
      const spy = sinon.spy(connection, 'close')

      // The lowest tag value will have the longest connection
      spies.set(peerTag, spy)
      await libp2p.peerStore.tagPeer(connection.remotePeer, peerTag, {
        value
      })

      await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))
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
    await pEvent(connectionManager, 'peer:prune')

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
          minConnections: 0,
          allow: [
            new MultiaddrFilter('/ip4/83.13.55.32/ipcidr/32')
          ]
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.connectionManager as DefaultConnectionManager
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')
    const spies = new Map<number, sinon.SinonSpy<[], Promise<void>>>()

    // Max out connections
    for (let i = 0; i < max; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      const spy = sinon.spy(connection, 'close')
      const value = (i + 1) * 10
      spies.set(value, spy)
      await libp2p.peerStore.tagPeer(connection.remotePeer, 'test-tag', {
        value
      })
      await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))
    }

    // an outbound connection is opened from an address in the allow list
    const remotePeer = await createEd25519PeerId()
    const connection = mockConnection(mockMultiaddrConnection({
      remoteAddr,
      source: [],
      sink: async () => {}
    }, remotePeer))

    const value = 0
    const spy = sinon.spy(connection, 'close')
    spies.set(value, spy)

    // Tag that allowed peer with lowest value
    await libp2p.peerStore.tagPeer(remotePeer, 'test-tag', {
      value
    })

    await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))

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
          maxConnections: max,
          minConnections: 0
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.connectionManager as DefaultConnectionManager
    const connectionManagerMaybePruneConnectionsSpy = sinon.spy(connectionManager.connectionPruner, 'maybePruneConnections')

    // Add 1 too many connections
    const spy = sinon.spy()
    for (let i = 0; i < max + 1; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      sinon.stub(connection, 'close').callsFake(async () => spy()) // eslint-disable-line
      await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))
    }

    // wait for prune event
    await pEvent(connectionManager, 'peer:prune')

    expect(connectionManagerMaybePruneConnectionsSpy.callCount).to.equal(6)

    expect(spy).to.have.property('callCount', 1)
  })

  it('should fail if the connection manager has mismatched connection limit options', async () => {
    await expect(createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: 5,
          minConnections: 6
        }
      }),
      started: false
    })).to.eventually.rejected('maxConnections must be greater')
  })

  it('should reconnect to important peers on startup', async () => {
    const peerId = await createEd25519PeerId()

    libp2p = await createNode({
      config: createBaseOptions(),
      started: false
    })

    const connectionManager = libp2p.connectionManager as DefaultConnectionManager
    const connectionManagerOpenConnectionSpy = sinon.spy(connectionManager, 'openConnection')

    await libp2p.start()

    expect(connectionManagerOpenConnectionSpy.called).to.be.false('Attempted to connect to peers')

    await libp2p.peerStore.tagPeer(peerId, KEEP_ALIVE)

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
    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    }, {
      ...defaultOptions,
      deny: [
        new MultiaddrFilter('/ip4/83.13.55.32/ipcidr/32')
      ]
    })

    const remotePeer = await createEd25519PeerId()
    const maConn = mockMultiaddrConnection({
      remoteAddr,
      source: [],
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections when maxConnections is exceeded', async () => {
    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    }, {
      ...defaultOptions,
      maxConnections: 1
    })

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>())

    // max out the connection limit
    await connectionManager.openConnection(await createEd25519PeerId())
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened
    const remotePeer = await createEd25519PeerId()
    const maConn = mockMultiaddrConnection({
      source: [],
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections from peers that connect too frequently', async () => {
    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    }, {
      ...defaultOptions,
      inboundConnectionThreshold: 1
    })

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>())

    // an inbound connection is opened
    const remotePeer = await createEd25519PeerId()
    const maConn = mockMultiaddrConnection({
      source: [],
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

    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    }, {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        new MultiaddrFilter('/ip4/83.13.55.32/ipcidr/32')
      ]
    })

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>())

    // max out the connection limit
    await connectionManager.openConnection(await createEd25519PeerId())
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened from an address in the allow list
    const remotePeer = await createEd25519PeerId()
    const maConn = mockMultiaddrConnection({
      remoteAddr,
      source: [],
      sink: async () => {}
    }, remotePeer)

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()
  })

  it('should limit the number of inbound pending connections', async () => {
    const connectionManager = new DefaultConnectionManager({
      peerId: await createEd25519PeerId(),
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    }, {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>())

    // start the upgrade
    const maConn1 = mockMultiaddrConnection({
      source: [],
      sink: async () => {}
    }, await createEd25519PeerId())

    await expect(connectionManager.acceptIncomingConnection(maConn1))
      .to.eventually.be.true()

    // start the upgrade
    const maConn2 = mockMultiaddrConnection({
      source: [],
      sink: async () => {}
    }, await createEd25519PeerId())

    // should be false because we have not completed the upgrade of maConn1
    await expect(connectionManager.acceptIncomingConnection(maConn2))
      .to.eventually.be.false()

    // finish the maConn1 pending upgrade
    connectionManager.afterUpgradeInbound()

    // should be true because we have now completed the upgrade of maConn1
    await expect(connectionManager.acceptIncomingConnection(maConn2))
      .to.eventually.be.true()
  })
})

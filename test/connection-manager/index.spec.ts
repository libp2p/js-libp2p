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
import { multiaddr } from '@multiformats/multiaddr'
import { stubInterface } from 'sinon-ts'
import type { Dialer } from '@libp2p/interface-connection-manager'
import type { Connection } from '@libp2p/interface-connection'
import type { Upgrader } from '@libp2p/interface-transport'
import type { PeerStore } from '@libp2p/interface-peer-store'

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
    const connectionManagerMaybeDisconnectOneSpy = sinon.spy(connectionManager, '_pruneConnections')
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

    expect(connectionManagerMaybeDisconnectOneSpy.callCount).to.equal(1)
    expect(lowestSpy).to.have.property('callCount', 1)
  })

  it('should close connection when the maximum has been reached even without tags', async () => {
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
    const connectionManagerMaybeDisconnectOneSpy = sinon.spy(connectionManager, '_pruneConnections')

    // Add 1 too many connections
    const spy = sinon.spy()
    for (let i = 0; i < max + 1; i++) {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      sinon.stub(connection, 'close').callsFake(async () => spy()) // eslint-disable-line
      await connectionManager._onConnect(new CustomEvent('connection', { detail: connection }))
    }

    expect(connectionManagerMaybeDisconnectOneSpy.callCount).to.equal(1)
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
      dialer: stubInterface<Dialer>()
    }, {
      ...defaultOptions,
      deny: [
        '/ip4/83.13.55.32'
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
    const dialer = stubInterface<Dialer>()
    dialer.dial.resolves(stubInterface<Connection>())

    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      dialer
    }, {
      ...defaultOptions,
      maxConnections: 1
    })

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
    const dialer = stubInterface<Dialer>()
    dialer.dial.resolves(stubInterface<Connection>())
    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      dialer
    }, {
      ...defaultOptions,
      inboundConnectionThreshold: 1
    })

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
    const dialer = stubInterface<Dialer>()
    dialer.dial.resolves(stubInterface<Connection>())
    const connectionManager = new DefaultConnectionManager({
      peerId: libp2p.peerId,
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      dialer
    }, {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip4/83.13.55.32'
      ]
    })

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
    const dialer = stubInterface<Dialer>()
    dialer.dial.resolves(stubInterface<Connection>())

    const connectionManager = new DefaultConnectionManager({
      peerId: await createEd25519PeerId(),
      upgrader: stubInterface<Upgrader>(),
      peerStore: stubInterface<PeerStore>(),
      dialer
    }, {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })

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

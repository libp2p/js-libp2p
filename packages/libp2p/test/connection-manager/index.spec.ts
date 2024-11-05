/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, KEEP_ALIVE, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { dns } from '@multiformats/dns'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { defaultComponents } from '../../src/components.js'
import { DefaultConnectionManager, type DefaultConnectionManagerComponents } from '../../src/connection-manager/index.js'
import { createLibp2p } from '../../src/index.js'
import { createPeers } from '../fixtures/create-peers.js'
import { getComponent } from '../fixtures/get-component.js'
import type { Echo } from '@libp2p/echo'
import type { ConnectionGater, PeerId, PeerStore, Libp2p, Connection, PeerRouting, MultiaddrConnection } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

const defaultOptions = {
  maxConnections: 10,
  inboundUpgradeTimeout: 10000
}

function createDefaultComponents (peerId: PeerId): DefaultConnectionManagerComponents {
  return {
    peerId,
    peerStore: stubInterface<PeerStore>({
      all: async () => []
    }),
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

  beforeEach(async () => {
    libp2p = await createLibp2p()
  })

  afterEach(async () => {
    await stop(connectionManager, libp2p)
  })

  it('should fail if the connection manager has mismatched connection limit options', async () => {
    await expect(
      createLibp2p({
        connectionManager: {
          maxConnections: -1
        }
      })
    ).to.eventually.rejected('maxConnections must be greater')
  })

  it('should reconnect to important peers on startup', async () => {
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    await libp2p.stop()

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
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      deny: [
        '/ip4/83.13.55.32'
      ]
    })
    await connectionManager.start()

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections when maxConnections is exceeded', async () => {
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxConnections: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      status: 'open'
    }))

    // max out the connection limit
    await connectionManager.openConnection(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened
    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr: multiaddr('/ip4/83.13.55.32/tcp/59283')
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should deny connections from peers that connect too frequently', async () => {
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      inboundConnectionThreshold: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      status: 'open'
    }))

    // an inbound connection is opened
    const maConn = stubInterface<MultiaddrConnection>({
      // has to be thin waist, which it will be since we've not done the peer id handshake
      // yet in the code being exercised by this test
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001')
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()

    // connect again within a second
    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should allow connections from allowlist multiaddrs', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip4/83.13.55.32'
      ]
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      status: 'open'
    }))

    // max out the connection limit
    await connectionManager.openConnection(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
    expect(connectionManager.getConnections()).to.have.lengthOf(1)

    // an inbound connection is opened from an address in the allow list
    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()
  })

  it('should limit the number of inbound pending connections', async () => {
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })
    await connectionManager.start()

    sinon.stub(connectionManager.dialQueue, 'dial').resolves(stubInterface<Connection>({
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      status: 'open'
    }))

    // start the upgrade
    const maConn1 = stubInterface<MultiaddrConnection>({
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001')
    })

    await expect(connectionManager.acceptIncomingConnection(maConn1))
      .to.eventually.be.true()

    // start the upgrade
    const maConn2 = stubInterface<MultiaddrConnection>({
      remoteAddr: multiaddr('/ip4/34.4.63.126/tcp/4001')
    })

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
    connectionManager = new DefaultConnectionManager(createDefaultComponents(libp2p.peerId), {
      ...defaultOptions,
      maxIncomingPendingConnections: 1
    })
    await connectionManager.start()

    const targetPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const addr = multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${targetPeer}`)

    const existingConnection = stubInterface<Connection>({
      limits: {
        bytes: 100n
      },
      remotePeer: targetPeer,
      remoteAddr: multiaddr(`/ip4/123.123.123.123/tcp/123/p2p-circuit/p2p/${targetPeer}`),
      status: 'open'
    })
    const newConnection = stubInterface<Connection>({
      remotePeer: targetPeer,
      remoteAddr: addr,
      status: 'open'
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

describe('Connection Manager', () => {
  let peerIds: PeerId[]

  before(async () => {
    peerIds = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])
  })

  it('should filter connections on disconnect, removing the closed one', async () => {
    const peerStore = stubInterface<PeerStore>()
    const components = defaultComponents({
      peerId: peerIds[0],
      peerStore,
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001'),
      remotePeer: peerIds[1],
      status: 'open'
    })
    const conn2 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.126/tcp/4001'),
      remotePeer: peerIds[1],
      status: 'open'
    })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(0)

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(2)

    conn2.status = 'closed'
    components.events.safeDispatchEvent('connection:close', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(1)

    expect(conn1.close.called).to.be.false()

    await connectionManager.stop()
  })

  it('should close connections on stop', async () => {
    const peerStore = stubInterface<PeerStore>()
    const components = defaultComponents({
      peerId: peerIds[0],
      peerStore,
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001'),
      remotePeer: peerIds[1],
      status: 'open'
    })
    const conn2 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.126/tcp/4001'),
      remotePeer: peerIds[1],
      status: 'open'
    })

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(2)

    await connectionManager.stop()

    expect(conn1.close.called).to.be.true()
    expect(conn2.close.called).to.be.true()

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(0)
  })
})

describe('libp2p.connections', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('libp2p.getConnections gets the connectionManager conns', async () => {
    ({ dialer, listener } = await createPeers())

    const conn = await dialer.dial(listener.getMultiaddrs())

    expect(conn).to.be.ok()
    expect(dialer.getConnections()).to.have.lengthOf(1)
  })

  it('should be closed status after stopping', async () => {
    ({ dialer, listener } = await createPeers())

    const conn = await dialer.dial(listener.getMultiaddrs())

    await dialer.stop()
    expect(conn.status).to.eql('closed')
  })

  it('should open multiple connections when forced', async () => {
    ({ dialer, listener } = await createPeers())

    // connect once, should have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // connect twice, should still only have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // force connection, should have two connections now
    await dialer.dial(listener.getMultiaddrs(), {
      force: true
    })
    expect(dialer.getConnections()).to.have.lengthOf(2)
  })

  it('should use custom DNS resolver', async () => {
    const resolver = sinon.stub()

    ;({ dialer, listener } = await createPeers({
      dns: dns({
        resolvers: {
          '.': resolver
        }
      })
    }))

    const ma = multiaddr('/dnsaddr/example.com/tcp/12345')
    const err = new Error('Could not resolve')

    resolver.withArgs('_dnsaddr.example.com').rejects(err)

    await expect(dialer.dial(ma)).to.eventually.be.rejectedWith(err)
  })
})

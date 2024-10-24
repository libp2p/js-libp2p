/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { KEEP_ALIVE, start, stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { createLibp2p } from '../../src/index.js'
import { getComponent } from '../fixtures/get-component.js'
import { createDefaultConnectionManagerComponents, type StubbedDefaultConnectionManagerComponents } from './utils.js'
import type { Libp2p, Connection, MultiaddrConnection } from '@libp2p/interface'

const defaultOptions = {
  maxConnections: 10,
  inboundUpgradeTimeout: 10000
}

describe('Connection Manager', () => {
  let libp2p: Libp2p
  let connectionManager: DefaultConnectionManager
  let components: StubbedDefaultConnectionManagerComponents

  beforeEach(async () => {
    libp2p = await createLibp2p()
    components = await createDefaultConnectionManagerComponents()
  })

  afterEach(async () => {
    await stop(connectionManager, libp2p)
  })

  it('should correctly parse and store allow and deny lists as IpNet objects in ConnectionManager', () => {
    // Define common IPs and CIDRs for reuse
    const ipAllowDeny = [
      '/ip4/83.13.55.32', // Single IP address
      '/ip4/83.13.55.32/ipcidr/32', // CIDR notation for a single IP
      '/ip4/192.168.1.1/ipcidr/24' // CIDR notation for a network
    ]

    // Initialize mock input for the allow and deny lists
    const mockInit = {
      allow: [...ipAllowDeny],
      deny: [...ipAllowDeny]
    }

    // Create an instance of the DefaultConnectionManager with the mock initialization
    const connectionManager = new DefaultConnectionManager(components, mockInit)

    // Define the expected IpNet objects that should result from parsing the allow and deny lists
    const expectedIpNets = [
      {
        mask: new Uint8Array([255, 255, 255, 255]), // Netmask for a single IP address
        network: new Uint8Array([83, 13, 55, 32]) // Network address for '83.13.55.32'
      },
      {
        mask: new Uint8Array([255, 255, 255, 255]), // Netmask for a single IP address
        network: new Uint8Array([83, 13, 55, 32]) // Network address for '83.13.55.32'
      },
      {
        mask: new Uint8Array([255, 255, 255, 0]), // Netmask for a /24 CIDR block
        network: new Uint8Array([192, 168, 1, 0]) // Network address for '192.168.1.0'
      }
    ]

    // Test that the 'allow' list is correctly parsed and stored as IpNet objects
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(connectionManager['allow']).to.deep.equal(expectedIpNets)

    // Test that the 'deny' list is correctly parsed and stored as IpNet objects
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(connectionManager['deny']).to.deep.equal(expectedIpNets)
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

  it('should deny connections from denylist multiaddrs (IPv4)', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    connectionManager = new DefaultConnectionManager(components, {
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

  it('should allow connections from allowlist multiaddrs (IPv6)', async () => {
    const remoteAddr = multiaddr('/ip6/2001:db8::1/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip6/2001:db8::1'
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

  it('should deny connections from denylist multiaddrs (IPv6)', async () => {
    const remoteAddr = multiaddr('/ip6/2001:db8::1/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      deny: [
        '/ip6/2001:db8::1'
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
    connectionManager = new DefaultConnectionManager(components, {
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
    connectionManager = new DefaultConnectionManager(components, {
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

  it('should allow connections from allowlist multiaddrs (IPv4)', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    connectionManager = new DefaultConnectionManager(components, {
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

  it('should allow connections from allowlist subnet (IPv4)', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip4/83.13.55.0/ipcidr/24' // Allow IPv4 subnet /24
      ]
    })
    await connectionManager.start()

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()
  })

  it('should deny connections from denylist subnet (IPv4)', async () => {
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      deny: [
        '/ip4/83.13.55.0/ipcidr/24' // Deny IPv4 subnet /24
      ]
    })
    await connectionManager.start()

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should allow connections from allowlist subnet (IPv6)', async () => {
    const remoteAddr = multiaddr('/ip6/2001:db8::1/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      maxConnections: 1,
      allow: [
        '/ip6/2001:db8::/ipcidr/64' // Allow an IPv6 subnet
      ]
    })
    await connectionManager.start()

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.true()
  })

  it('should deny connections from denylist subnet (IPv6)', async () => {
    const remoteAddr = multiaddr('/ip6/2001:db8::1/tcp/59283')
    const connectionManager = new DefaultConnectionManager(components, {
      ...defaultOptions,
      deny: [
        '/ip6/2001:db8::/ipcidr/64' // Deny an IPv6 subnet
      ]
    })
    await connectionManager.start()

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(connectionManager.acceptIncomingConnection(maConn))
      .to.eventually.be.false()
  })

  it('should limit the number of inbound pending connections', async () => {
    connectionManager = new DefaultConnectionManager(components, {
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
    connectionManager = new DefaultConnectionManager(components, {
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

  it('should filter connections on disconnect, removing the closed one', async () => {
    connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const conn1 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001'),
      remotePeer,
      status: 'open'
    })
    const conn2 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.126/tcp/4001'),
      remotePeer,
      status: 'open'
    })

    expect(connectionManager.getConnections(remotePeer)).to.have.lengthOf(0)

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(remotePeer)).to.have.lengthOf(2)

    conn2.status = 'closed'
    components.events.safeDispatchEvent('connection:close', { detail: conn2 })

    expect(connectionManager.getConnections(remotePeer)).to.have.lengthOf(1)

    expect(conn1.close.called).to.be.false()
  })

  it('should close connections on stop', async () => {
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const conn1 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.125/tcp/4001'),
      remotePeer,
      status: 'open'
    })
    const conn2 = stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/34.4.63.126/tcp/4001'),
      remotePeer,
      status: 'open'
    })

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(remotePeer)).to.have.lengthOf(2)

    await connectionManager.stop()

    expect(conn1.close.called).to.be.true()
    expect(conn2.close.called).to.be.true()

    expect(connectionManager.getConnections(remotePeer)).to.have.lengthOf(0)
  })
})

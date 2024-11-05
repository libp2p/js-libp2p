/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { mockDuplex, mockMultiaddrConnection, mockConnection } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerFilter } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { stubInterface } from 'sinon-ts'
import { DefaultRegistrar } from '../../src/registrar.js'
import type { TypedEventTarget, Libp2pEvents, PeerId, PeerStore, Topology, Peer } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const protocol = '/test/1.0.0'

describe('registrar topologies', () => {
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  let connectionManager: StubbedInstance<ConnectionManager>
  let peerStore: StubbedInstance<PeerStore>
  let events: TypedEventTarget<Libp2pEvents>

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    connectionManager = stubInterface<ConnectionManager>()
    peerStore = stubInterface<PeerStore>()
    events = new TypedEventEmitter<Libp2pEvents>()

    registrar = new DefaultRegistrar({
      peerId,
      connectionManager,
      peerStore,
      events,
      logger: defaultLogger()
    })
  })

  it('should be able to register a protocol', async () => {
    const topology: Topology = {
      onConnect: () => { },
      onDisconnect: () => { }
    }

    expect(registrar.getTopologies(protocol)).to.have.lengthOf(0)

    const identifier = await registrar.register(protocol, topology)

    expect(identifier).to.exist()
    expect(registrar.getTopologies(protocol)).to.have.lengthOf(1)
  })

  it('should be able to unregister a protocol', async () => {
    const topology: Topology = {
      onConnect: () => { },
      onDisconnect: () => { }
    }

    expect(registrar.getTopologies(protocol)).to.have.lengthOf(0)

    const identifier = await registrar.register(protocol, topology)

    expect(registrar.getTopologies(protocol)).to.have.lengthOf(1)

    registrar.unregister(identifier)

    expect(registrar.getTopologies(protocol)).to.have.lengthOf(0)
  })

  it('should not error if unregistering unregistered topology handler', () => {
    registrar.unregister('bad-identifier')
  })

  it('should call onConnect handler for connected peers after register', async () => {
    const onConnectDefer = pDefer()
    const onDisconnectDefer = pDefer()

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

    // return connection from connection manager
    connectionManager.getConnections.withArgs(remotePeerId).returns([conn])

    const topology: Topology = {
      onConnect: (peerId, connection) => {
        expect(peerId.equals(remotePeerId)).to.be.true()
        expect(connection.id).to.eql(conn.id)

        onConnectDefer.resolve()
      },
      onDisconnect: (peerId) => {
        expect(peerId.equals(remotePeerId)).to.be.true()

        onDisconnectDefer.resolve()
      }
    }

    // Register protocol
    await registrar.register(protocol, topology)

    // Peer data is in the peer store
    peerStore.get.withArgs(remotePeerId).resolves({
      id: remotePeerId,
      addresses: [],
      protocols: [protocol],
      metadata: new Map(),
      tags: new Map()
    })

    // remote peer connects
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: conn
      }
    })
    await onConnectDefer.promise

    // remote peer disconnects
    await conn.close()
    events.safeDispatchEvent('peer:disconnect', {
      detail: remotePeerId
    })
    await onDisconnectDefer.promise
  })

  it('should call onConnect handler after register, once a peer is connected and protocols are updated', async () => {
    const onConnectDefer = pDefer()
    const onDisconnectDefer = pDefer()

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

    // return connection from connection manager
    connectionManager.getConnections.withArgs(remotePeerId).returns([conn])

    const topology: Topology = {
      onConnect: () => {
        onConnectDefer.resolve()
      },
      onDisconnect: () => {
        onDisconnectDefer.resolve()
      }
    }

    // Register protocol
    await registrar.register(protocol, topology)

    // remote peer connects
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: conn
      }
    })

    // Can get details after identify
    peerStore.get.withArgs(conn.remotePeer).resolves({
      id: conn.remotePeer,
      addresses: [],
      protocols: [protocol],
      metadata: new Map(),
      tags: new Map()
    })

    // we have a connection to this peer
    connectionManager.getConnections.withArgs(conn.remotePeer).returns([conn])

    // identify completes
    events.safeDispatchEvent('peer:update', {
      detail: {
        peer: {
          id: conn.remotePeer,
          protocols: [protocol],
          addresses: [],
          metadata: new Map()
        }
      }
    })

    await onConnectDefer.promise

    // Peer no longer supports the protocol our topology is registered for
    events.safeDispatchEvent('peer:update', {
      detail: {
        peer: {
          id: conn.remotePeer,
          protocols: [],
          addresses: [],
          metadata: new Map()
        },
        previous: {
          id: conn.remotePeer,
          protocols: [protocol],
          addresses: [],
          metadata: new Map()
        }
      }
    })

    await onDisconnectDefer.promise
  })

  it('should not call topology handlers for limited connection', async () => {
    const onConnectDefer = pDefer()
    const onDisconnectDefer = pDefer()

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

    // connection is limited
    conn.limits = {
      bytes: 100n
    }

    // return connection from connection manager
    connectionManager.getConnections.withArgs(remotePeerId).returns([conn])

    const topology: Topology = {
      onConnect: () => {
        onConnectDefer.reject(new Error('Topolgy onConnect called for limited connection'))
      },
      onDisconnect: () => {
        onDisconnectDefer.reject(new Error('Topolgy onDisconnect called for limited connection'))
      }
    }

    // register topology for protocol
    await registrar.register(protocol, topology)

    // remote peer connects
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: conn
      }
    })

    await expect(Promise.any([
      onConnectDefer.promise,
      onDisconnectDefer.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 1000)
      })
    ])).to.eventually.not.be.rejected()
  })

  it('should call topology onConnect handler for limited connection when explicitly requested', async () => {
    const onConnectDefer = pDefer()

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

    // connection is limited
    conn.limits = {
      bytes: 100n
    }

    // return connection from connection manager
    connectionManager.getConnections.withArgs(remotePeerId).returns([conn])

    const topology: Topology = {
      notifyOnLimitedConnection: true,
      onConnect: () => {
        onConnectDefer.resolve()
      }
    }

    // register topology for protocol
    await registrar.register(protocol, topology)

    // remote peer connects
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: conn
      }
    })

    await expect(onConnectDefer.promise).to.eventually.be.undefined()
  })

  it('should call topology handlers for non-limited connection opened after limited connection', async () => {
    const onConnectDefer = pDefer()
    let callCount = 0

    const topology: Topology = {
      notifyOnLimitedConnection: true,
      onConnect: () => {
        callCount++

        if (callCount === 2) {
          onConnectDefer.resolve()
        }
      }
    }

    // register topology for protocol
    await registrar.register(protocol, topology)

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const limitedConnection = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))
    limitedConnection.limits = {
      bytes: 100n
    }

    const nonLimitedConnection = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))
    nonLimitedConnection.limits = {
      bytes: 100n
    }

    // return connection from connection manager
    connectionManager.getConnections.withArgs(remotePeerId).returns([
      limitedConnection,
      nonLimitedConnection
    ])

    // remote peer connects over limited connection
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: limitedConnection
      }
    })

    // remote peer opens non-limited connection
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: nonLimitedConnection
      }
    })

    await expect(onConnectDefer.promise).to.eventually.be.undefined()
  })

  it('should use a filter to prevent duplicate onConnect notifications', async () => {
    const topology: Topology = stubInterface<Topology>({
      filter: peerFilter(1024)
    })

    // register topology for protocol
    await registrar.register(protocol, topology)

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

    // remote peer runs identify a few times
    for (let i = 0; i < 5; i++) {
      events.safeDispatchEvent('peer:identify', {
        detail: {
          peerId: remotePeerId,
          protocols: [protocol],
          connection
        }
      })
    }

    // remote peer updates details a few times
    for (let i = 0; i < 5; i++) {
      events.safeDispatchEvent('peer:update', {
        detail: {
          peer: {
            id: remotePeerId,
            protocols: [protocol]
          },
          previous: {
            protocols: []
          }
        }
      })
    }

    // should only have notified once
    expect(topology.onConnect).to.have.property('callCount', 1)
  })

  it('should use a filter to prevent onDisconnect notifications that had no previous onConnect notification', async () => {
    const topology: Topology = stubInterface<Topology>({
      filter: peerFilter(1024)
    })

    // register topology for protocol
    await registrar.register(protocol, topology)

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // peer exists in peer store with the regsitered protocol
    peerStore.get.withArgs(remotePeerId).resolves(stubInterface<Peer>({
      protocols: [protocol]
    }))

    // the peer disconnects
    events.safeDispatchEvent('peer:disconnect', {
      detail: remotePeerId
    })

    // should not have notified
    expect(topology.onConnect).to.have.property('called', false)
    expect(topology.onDisconnect).to.have.property('called', false)
  })
})

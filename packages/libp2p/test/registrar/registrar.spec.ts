import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerFilter } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { TypedEventEmitter } from 'main-event'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Registrar } from '../../src/registrar.js'
import type { Libp2pEvents, PeerId, PeerStore, Topology, TopologyFilter, Peer, Connection } from '@libp2p/interface'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

const protocol = '/test/1.0.0'

describe('registrar topologies', () => {
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  let peerStore: StubbedInstance<PeerStore>
  let events: TypedEventTarget<Libp2pEvents>

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    peerStore = stubInterface<PeerStore>()
    events = new TypedEventEmitter<Libp2pEvents>()

    registrar = new Registrar({
      peerId,
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
    const conn = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: undefined
    })

    const topology: Topology = {
      onConnect: (peerId, connection) => {
        expect(peerId.equals(remotePeerId)).to.be.true()
        expect(connection).to.equal(conn)

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
    const conn = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: undefined
    })

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
    // connection is limited
    const conn = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: {
        bytes: 100n
      }
    })

    const topology: Topology = {
      onConnect: () => {
        onConnectDefer.reject(new Error('Topology onConnect called for limited connection'))
      },
      onDisconnect: () => {
        onDisconnectDefer.reject(new Error('Topology onDisconnect called for limited connection'))
      }
    }

    // register topology for protocol
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

    // wait a bit to ensure onConnect is not called
    await expect(Promise.any([
      onConnectDefer.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    ])).to.eventually.not.be.rejected()

    // now simulate disconnect
    events.safeDispatchEvent('peer:disconnect', {
      detail: remotePeerId
    })

    // wait to ensure onDisconnect is not called
    await expect(Promise.any([
      onDisconnectDefer.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    ])).to.eventually.not.be.rejected()
  })

  it('should call topology onConnect handler for limited connection when explicitly requested', async () => {
    const onConnectDefer = pDefer()
    const onDisconnectDefer = pDefer()

    // setup connections before registrar
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    // connection is limited
    const conn = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: {
        bytes: 100n
      }
    })

    const topology: Topology = {
      notifyOnLimitedConnection: true,
      onConnect: () => {
        onConnectDefer.resolve()
      },
      onDisconnect: () => {
        onDisconnectDefer.resolve()
      }
    }

    // register topology for protocol
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

    await expect(onConnectDefer.promise).to.eventually.be.undefined()

    // now simulate disconnect - this should also be called
    events.safeDispatchEvent('peer:disconnect', {
      detail: remotePeerId
    })

    await expect(onDisconnectDefer.promise).to.eventually.be.undefined()
  })

  it('should not call topology onDisconnect when peer was filtered out during connect', async () => {
    const onDisconnectDefer = pDefer()

    // setup peer
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // topology WITH filter - this is required to track which peers were notified
    const filter = stubInterface<TopologyFilter>({
      has: sinon.stub().returns(false),
      add: sinon.stub(),
      remove: sinon.stub()
    })

    const topology: Topology = {
      filter,
      onDisconnect: () => {
        onDisconnectDefer.reject(new Error('Topology onDisconnect called for peer that was never onConnect\'d'))
      }
    }

    // register topology for protocol
    await registrar.register(protocol, topology)

    // Peer data is in the peer store
    peerStore.get.withArgs(remotePeerId).resolves({
      id: remotePeerId,
      addresses: [],
      protocols: [protocol],
      metadata: new Map(),
      tags: new Map()
    })

    // simulate disconnect without the peer ever being in the filter
    // (this happens when a limited connection connects and disconnects
    // but the topology has notifyOnLimitedConnection: false)
    events.safeDispatchEvent('peer:disconnect', {
      detail: remotePeerId
    })

    // wait to ensure onDisconnect is not called
    await expect(Promise.any([
      onDisconnectDefer.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    ])).to.eventually.not.be.rejected()
  })

  it('should not call topology onDisconnect on peer update when peer was filtered out during connect', async () => {
    const onDisconnectDefer = pDefer()

    // setup peer
    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // connection is limited
    const conn = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: {
        bytes: 100n
      }
    })

    // topology WITH filter - this is required to track which peers were notified
    const filter = stubInterface<TopologyFilter>({
      has: sinon.stub().returns(false),
      add: sinon.stub(),
      remove: sinon.stub()
    })

    const topology: Topology = {
      filter,
      // notifyOnLimitedConnection is NOT set (defaults to false)
      onDisconnect: () => {
        onDisconnectDefer.reject(new Error('Topology onDisconnect called for peer that was never onConnect\'d'))
      }
    }

    // register topology for protocol
    await registrar.register(protocol, topology)

    // Peer data is in the peer store with the protocol
    peerStore.get.withArgs(remotePeerId).resolves({
      id: remotePeerId,
      addresses: [],
      protocols: [protocol],
      metadata: new Map(),
      tags: new Map()
    })

    // remote peer identifies with limited connection
    events.safeDispatchEvent('peer:identify', {
      detail: {
        peerId: remotePeerId,
        protocols: [protocol],
        connection: conn
      }
    })

    // wait a bit to ensure onConnect is not called (because connection is limited)
    await new Promise(resolve => setTimeout(resolve, 100))

    // now simulate peer update removing the protocol
    // (this triggers onDisconnect in _onPeerUpdate)
    events.safeDispatchEvent('peer:update', {
      detail: {
        peer: {
          id: remotePeerId,
          protocols: [], // protocol removed
          addresses: [],
          metadata: new Map()
        },
        previous: {
          id: remotePeerId,
          protocols: [protocol], // had protocol before
          addresses: [],
          metadata: new Map()
        }
      }
    })

    // wait to ensure onDisconnect is not called
    await expect(Promise.any([
      onDisconnectDefer.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    ])).to.eventually.not.be.rejected()
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
    const limitedConnection = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: {
        bytes: 100n
      }
    })

    const nonLimitedConnection = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: undefined
    })

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
    const connection = stubInterface<Connection>({
      remotePeer: remotePeerId,
      limits: undefined
    })

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

    // peer exists in peer store with the registered protocol
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

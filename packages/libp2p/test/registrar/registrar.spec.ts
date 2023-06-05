/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-mocks'
import { CodeError } from '@libp2p/interfaces/errors'
import { EventEmitter } from '@libp2p/interfaces/events'
import { mplex } from '@libp2p/mplex'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { createTopology } from '@libp2p/topology'
import { webSockets } from '@libp2p/websockets'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import pDefer from 'p-defer'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { type Components, defaultComponents } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { codes } from '../../src/errors.js'
import { plaintext } from '../../src/insecure/index.js'
import { createLibp2pNode, type Libp2pNode } from '../../src/libp2p.js'
import { DefaultRegistrar } from '../../src/registrar.js'
import { matchPeerId } from '../fixtures/match-peer-id.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Registrar } from '@libp2p/interface-registrar'
import type { TransportManager } from '@libp2p/interface-transport'

const protocol = '/test/1.0.0'

describe('registrar', () => {
  let components: Components
  let registrar: Registrar
  let peerId: PeerId
  let libp2p: Libp2pNode

  before(async () => {
    peerId = await createPeerId()
  })

  describe('errors', () => {
    beforeEach(() => {
      const events = new EventEmitter()
      components = defaultComponents({
        peerId,
        events,
        datastore: new MemoryDatastore(),
        upgrader: mockUpgrader({ events }),
        transportManager: stubInterface<TransportManager>(),
        connectionGater: stubInterface<ConnectionGater>()
      })
      components.peerStore = new PersistentPeerStore(components)
      components.connectionManager = new DefaultConnectionManager(components, {
        minConnections: 50,
        maxConnections: 1000,
        inboundUpgradeTimeout: 1000
      })
      registrar = new DefaultRegistrar(components)
    })

    it('should fail to register a protocol if no multicodec is provided', () => {
      // @ts-expect-error invalid parameters
      return expect(registrar.register()).to.eventually.be.rejected()
    })

    it('should fail to register a protocol if an invalid topology is provided', () => {
      const fakeTopology = {
        random: 1
      }

      // @ts-expect-error invalid parameters
      return expect(registrar.register(fakeTopology)).to.eventually.be.rejected()
    })
  })

  describe('registration', () => {
    let registrar: Registrar
    let peerId: PeerId
    let connectionManager: StubbedInstance<ConnectionManager>
    let peerStore: StubbedInstance<PeerStore>
    let events: EventEmitter<Libp2pEvents>

    beforeEach(async () => {
      peerId = await createEd25519PeerId()
      connectionManager = stubInterface<ConnectionManager>()
      peerStore = stubInterface<PeerStore>()
      events = new EventEmitter<Libp2pEvents>()

      registrar = new DefaultRegistrar({
        peerId,
        connectionManager,
        peerStore,
        events
      })
    })

    it('should be able to register a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

      expect(registrar.getTopologies(protocol)).to.have.lengthOf(0)

      const identifier = await registrar.register(protocol, topology)

      expect(identifier).to.exist()
      expect(registrar.getTopologies(protocol)).to.have.lengthOf(1)
    })

    it('should be able to unregister a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

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

      // Setup connections before registrar
      const remotePeerId = await createEd25519PeerId()
      const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

      // return connection from connection manager
      connectionManager.getConnections.withArgs(matchPeerId(remotePeerId)).returns([conn])

      const topology = createTopology({
        onConnect: (peerId, connection) => {
          expect(peerId.equals(remotePeerId)).to.be.true()
          expect(connection.id).to.eql(conn.id)

          onConnectDefer.resolve()
        },
        onDisconnect: (peerId) => {
          expect(peerId.equals(remotePeerId)).to.be.true()

          onDisconnectDefer.resolve()
        }
      })

      // Register protocol
      await registrar.register(protocol, topology)

      // Peer data is in the peer store
      peerStore.get.withArgs(matchPeerId(remotePeerId)).resolves({
        id: remotePeerId,
        addresses: [],
        protocols: [protocol],
        metadata: new Map(),
        tags: new Map()
      })

      // remote peer connects
      events.safeDispatchEvent('peer:connect', {
        detail: remotePeerId
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

      // Setup connections before registrar
      const remotePeerId = await createEd25519PeerId()
      const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

      // return connection from connection manager
      connectionManager.getConnections.withArgs(matchPeerId(remotePeerId)).returns([conn])

      const topology = createTopology({
        onConnect: () => {
          onConnectDefer.resolve()
        },
        onDisconnect: () => {
          onDisconnectDefer.resolve()
        }
      })

      // Register protocol
      await registrar.register(protocol, topology)

      // No details before identify
      peerStore.get.withArgs(matchPeerId(conn.remotePeer)).rejects(new CodeError('Not found', codes.ERR_NOT_FOUND))

      // remote peer connects
      events.safeDispatchEvent('peer:connect', {
        detail: remotePeerId
      })

      // Can get details after identify
      peerStore.get.withArgs(matchPeerId(conn.remotePeer)).resolves({
        id: conn.remotePeer,
        addresses: [],
        protocols: [protocol],
        metadata: new Map(),
        tags: new Map()
      })

      // we have a connection to this peer
      connectionManager.getConnections.withArgs(matchPeerId(conn.remotePeer)).returns([conn])

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

    it('should be able to register and unregister a handler', async () => {
      const deferred = pDefer<Components>()

      libp2p = await createLibp2pNode({
        peerId: await createEd25519PeerId(),
        transports: [
          webSockets()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionEncryption: [
          plaintext()
        ],
        services: {
          test: (components: any) => {
            deferred.resolve(components)
          }
        }
      })

      const components = await deferred.promise

      const registrar = components.registrar

      expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0', '/echo/1.0.1'])

      const echoHandler = (): void => {}
      await libp2p.handle(['/echo/1.0.0', '/echo/1.0.1'], echoHandler)
      expect(registrar.getHandler('/echo/1.0.0')).to.have.property('handler', echoHandler)
      expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)

      await libp2p.unhandle(['/echo/1.0.0'])
      expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0'])
      expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)
    })
  })
})

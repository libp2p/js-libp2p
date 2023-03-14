/* eslint-env mocha */

import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { MemoryDatastore } from 'datastore-core/memory'
import { createTopology } from '@libp2p/topology'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultRegistrar } from '../../src/registrar.js'
import { mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-mocks'
import { createPeerId, createNode } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Registrar } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { CustomEvent } from '@libp2p/interfaces/events'
import type { Connection } from '@libp2p/interface-connection'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { plaintext } from '../../src/insecure/index.js'
import { webSockets } from '@libp2p/websockets'
import { mplex } from '@libp2p/mplex'
import type { PeerProtocolsChangeData } from '@libp2p/interface-peer-store'
import { DefaultComponents } from '../../src/components.js'

const protocol = '/test/1.0.0'

describe('registrar', () => {
  let components: DefaultComponents
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = await createPeerId()
  })

  describe('errors', () => {
    beforeEach(() => {
      components = new DefaultComponents({
        peerId,
        datastore: new MemoryDatastore(),
        upgrader: mockUpgrader()
      })
      components.peerStore = new PersistentPeerStore(components)
      components.connectionManager = new DefaultConnectionManager(components, {
        minConnections: 50,
        maxConnections: 1000,
        autoDialInterval: 1000,
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
    let libp2p: Libp2pNode

    beforeEach(async () => {
      libp2p = await createNode({
        config: createBaseOptions(),
        started: false
      })
    })

    afterEach(async () => { await libp2p.stop() })

    it('should be able to register a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

      expect(libp2p.components.registrar.getTopologies(protocol)).to.have.lengthOf(0)

      const identifier = await libp2p.components.registrar.register(protocol, topology)

      expect(identifier).to.exist()
      expect(libp2p.components.registrar.getTopologies(protocol)).to.have.lengthOf(1)
    })

    it('should be able to unregister a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

      expect(libp2p.components.registrar.getTopologies(protocol)).to.have.lengthOf(0)

      const identifier = await libp2p.components.registrar.register(protocol, topology)

      expect(libp2p.components.registrar.getTopologies(protocol)).to.have.lengthOf(1)

      libp2p.components.registrar.unregister(identifier)

      expect(libp2p.components.registrar.getTopologies(protocol)).to.have.lengthOf(0)
    })

    it('should not error if unregistering unregistered topology handler', () => {
      libp2p.components.registrar.unregister('bad-identifier')
    })

    it('should call onConnect handler for connected peers after register', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      // Setup connections before registrar
      const remotePeerId = await createEd25519PeerId()
      const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

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

      await libp2p.start()

      // Register protocol
      await libp2p.components.registrar.register(protocol, topology)

      // Add connected peer with protocol to peerStore and registrar
      await libp2p.peerStore.protoBook.set(remotePeerId, [protocol])

      // remote peer connects
      libp2p.components.upgrader.dispatchEvent(new CustomEvent<Connection>('connection', {
        detail: conn
      }))
      await onConnectDefer.promise
      // remote peer disconnects
      await conn.close()
      libp2p.components.upgrader.dispatchEvent(new CustomEvent<Connection>('connectionEnd', {
        detail: conn
      }))
      await onDisconnectDefer.promise
    })

    it('should call onConnect handler after register, once a peer is connected and protocols are updated', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      // Setup connections before registrar
      const remotePeerId = await createEd25519PeerId()
      const conn = mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId))

      const topology = createTopology({
        onConnect: () => {
          onConnectDefer.resolve()
        },
        onDisconnect: () => {
          onDisconnectDefer.resolve()
        }
      })

      await libp2p.start()

      // Register protocol
      await libp2p.components.registrar.register(protocol, topology)

      // Add connected peer to peerStore and registrar
      await libp2p.peerStore.protoBook.set(remotePeerId, [])

      // remote peer connects
      libp2p.components.upgrader.dispatchEvent(new CustomEvent<Connection>('connection', {
        detail: conn
      }))

      // identify completes
      libp2p.components.peerStore.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>('change:protocols', {
        detail: {
          peerId: conn.remotePeer,
          protocols: [protocol],
          oldProtocols: []
        }
      }))

      await onConnectDefer.promise

      // Peer no longer supports the protocol our topology is registered for
      libp2p.components.peerStore.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>('change:protocols', {
        detail: {
          peerId: conn.remotePeer,
          protocols: [],
          oldProtocols: [protocol]
        }
      }))

      await onDisconnectDefer.promise
    })

    it('should be able to register and unregister a handler', async () => {
      libp2p = await createLibp2pNode({
        peerId: await createEd25519PeerId(),
        transports: [
          webSockets()
        ],
        streamMuxers: [
          mplex()
        ],
        connectionEncryption: [
          plaintext()
        ]
      })

      const registrar = libp2p.components.registrar

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

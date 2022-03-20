/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import pDefer from 'p-defer'
import { MemoryDatastore } from 'datastore-core/memory'
import { createTopology } from '@libp2p/topology'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultRegistrar } from '../../src/registrar.js'
import { mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-compliance-tests/mocks'
import { createPeerId, createNode } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Registrar } from '@libp2p/interfaces/registrar'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { Components } from '@libp2p/interfaces/components'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { CustomEvent } from '@libp2p/interfaces'
import type { Connection } from '@libp2p/interfaces/connection'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { Plaintext } from '../../src/insecure/index.js'
import { WebSockets } from '@libp2p/websockets'
import { Mplex } from '@libp2p/mplex'

const protocol = '/test/1.0.0'

describe('registrar', () => {
  const connectionGater = mockConnectionGater()
  let components: Components
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = await createPeerId()
  })

  describe('errors', () => {
    beforeEach(() => {
      components = new Components({
        peerId,
        datastore: new MemoryDatastore(),
        upgrader: mockUpgrader()
      })
      components.setPeerStore(new PersistentPeerStore(components, {
        addressFilter: connectionGater.filterMultiaddrForPeer
      }))
      components.setConnectionManager(new DefaultConnectionManager(components))
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

    afterEach(async () => await libp2p.stop())

    it('should be able to register a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

      expect(libp2p.components.getRegistrar().getTopologies(protocol)).to.have.lengthOf(0)

      const identifier = await libp2p.components.getRegistrar().register(protocol, topology)

      expect(identifier).to.exist()
      expect(libp2p.components.getRegistrar().getTopologies(protocol)).to.have.lengthOf(1)
    })

    it('should be able to unregister a protocol', async () => {
      const topology = createTopology({
        onConnect: () => { },
        onDisconnect: () => { }
      })

      expect(libp2p.components.getRegistrar().getTopologies(protocol)).to.have.lengthOf(0)

      const identifier = await libp2p.components.getRegistrar().register(protocol, topology)

      expect(libp2p.components.getRegistrar().getTopologies(protocol)).to.have.lengthOf(1)

      libp2p.components.getRegistrar().unregister(identifier)

      expect(libp2p.components.getRegistrar().getTopologies(protocol)).to.have.lengthOf(0)
    })

    it('should not error if unregistering unregistered topology handler', () => {
      libp2p.components.getRegistrar().unregister('bad-identifier')
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
      await libp2p.components.getRegistrar().register(protocol, topology)

      // Add connected peer with protocol to peerStore and registrar
      await libp2p.peerStore.protoBook.add(remotePeerId, [protocol])

      // remote peer connects
      await libp2p.components.getUpgrader().dispatchEvent(new CustomEvent<Connection>('connection', {
        detail: conn
      }))

      // remote peer disconnects
      await conn.close()
      await libp2p.components.getUpgrader().dispatchEvent(new CustomEvent<Connection>('connectionEnd', {
        detail: conn
      }))

      // Wait for handlers to be called
      return await Promise.all([
        onConnectDefer.promise,
        onDisconnectDefer.promise
      ])
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
      await libp2p.components.getRegistrar().register(protocol, topology)

      // Add connected peer to peerStore and registrar
      await libp2p.peerStore.protoBook.set(remotePeerId, [])

      // Add protocol to peer and update it
      await libp2p.peerStore.protoBook.add(remotePeerId, [protocol])

      await libp2p.components.getUpgrader().dispatchEvent(new CustomEvent<Connection>('connection', {
        detail: conn
      }))

      await onConnectDefer.promise

      // Peer no longer supports the protocol our topology is registered for
      await libp2p.peerStore.protoBook.set(remotePeerId, [])

      await onDisconnectDefer.promise
    })

    it('should be able to register and unregister a handler', async () => {
      libp2p = await createLibp2pNode({
        peerId: await createEd25519PeerId(),
        transports: [
          new WebSockets()
        ],
        streamMuxers: [
          new Mplex()
        ],
        connectionEncryption: [
          new Plaintext()
        ]
      })

      const registrar = libp2p.components.getRegistrar()

      expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0', '/echo/1.0.1'])

      const echoHandler = () => {}
      await libp2p.handle(['/echo/1.0.0', '/echo/1.0.1'], echoHandler)
      expect(registrar.getHandler('/echo/1.0.0')).to.equal(echoHandler)
      expect(registrar.getHandler('/echo/1.0.1')).to.equal(echoHandler)

      await libp2p.unhandle(['/echo/1.0.0'])
      expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0'])
      expect(registrar.getHandler('/echo/1.0.1')).to.equal(echoHandler)
    })
  })
})

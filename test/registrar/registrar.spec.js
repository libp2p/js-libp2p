'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const pDefer = require('p-defer')

const { EventEmitter } = require('events')
const { MemoryDatastore } = require('datastore-core/memory')
const Topology = require('libp2p-interfaces/src/topology/multicodec-topology')
const PeerStore = require('../../src/peer-store')
const Registrar = require('../../src/registrar')
const { mockConnectionGater } = require('../utils/mock-connection-gater')
const createMockConnection = require('../utils/mockConnection')
const peerUtils = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options.browser')

const multicodec = '/test/1.0.0'

describe('registrar', () => {
  const connectionGater = mockConnectionGater()
  let peerStore
  let registrar
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('errors', () => {
    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore(),
        addressFilter: connectionGater.filterMultiaddrForPeer
      })
      registrar = new Registrar({ peerStore, connectionManager: new EventEmitter() })
    })

    it('should fail to register a protocol if no multicodec is provided', () => {
      return expect(registrar.register()).to.eventually.be.rejected()
    })

    it('should fail to register a protocol if an invalid topology is provided', () => {
      const fakeTopology = {
        random: 1
      }

      return expect(registrar.register(fakeTopology)).to.eventually.be.rejected()
    })
  })

  describe('registration', () => {
    let libp2p

    beforeEach(async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          modules: baseOptions.modules
        },
        started: false
      })
    })

    afterEach(() => libp2p.stop())

    it('should be able to register a protocol', async () => {
      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        }
      })

      const identifier = await libp2p.registrar.register(topologyProps)

      expect(identifier).to.exist()
    })

    it('should be able to unregister a protocol', async () => {
      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        }
      })

      const identifier = await libp2p.registrar.register(topologyProps)
      const success = libp2p.registrar.unregister(identifier)

      expect(success).to.eql(true)
    })

    it('should fail to unregister if no register was made', () => {
      const success = libp2p.registrar.unregister('bad-identifier')

      expect(success).to.eql(false)
    })

    it('should call onConnect handler for connected peers after register', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      // Setup connections before registrar
      const conn = await createMockConnection()
      const remotePeerId = conn.remotePeer

      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: (peerId, connection) => {
            expect(peerId.toB58String()).to.eql(remotePeerId.toB58String())
            expect(connection.id).to.eql(conn.id)

            onConnectDefer.resolve()
          },
          onDisconnect: (peerId) => {
            expect(peerId.toB58String()).to.eql(remotePeerId.toB58String())

            onDisconnectDefer.resolve()
          }
        }
      })

      // Register protocol
      const identifier = await libp2p.registrar.register(topologyProps)
      const topology = libp2p.registrar.topologies.get(identifier)

      // Topology created
      expect(topology).to.exist()

      // Add connected peer with protocol to peerStore and registrar
      await libp2p.peerStore.protoBook.add(remotePeerId, [multicodec])

      await libp2p.connectionManager.onConnect(conn)
      expect(libp2p.connectionManager.size).to.eql(1)

      await conn.close()

      libp2p.connectionManager.onDisconnect(conn)
      expect(libp2p.connectionManager.size).to.eql(0)

      // Wait for handlers to be called
      return Promise.all([
        onConnectDefer.promise,
        onDisconnectDefer.promise
      ])
    })

    it('should call onConnect handler after register, once a peer is connected and protocols are updated', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => {
            onConnectDefer.resolve()
          },
          onDisconnect: () => {
            onDisconnectDefer.resolve()
          }
        }
      })

      // Register protocol
      const identifier = await libp2p.registrar.register(topologyProps)
      const topology = libp2p.registrar.topologies.get(identifier)

      // Topology created
      expect(topology).to.exist()
      expect(libp2p.connectionManager.size).to.eql(0)

      // Setup connections before registrar
      const conn = await createMockConnection()
      const remotePeerId = conn.remotePeer

      // Add connected peer to peerStore and registrar
      await libp2p.peerStore.protoBook.set(remotePeerId, [])

      // Add protocol to peer and update it
      await libp2p.peerStore.protoBook.add(remotePeerId, [multicodec])

      await libp2p.connectionManager.onConnect(conn)
      await onConnectDefer.promise

      // Remove protocol to peer and update it
      await libp2p.peerStore.protoBook.set(remotePeerId, [])

      await onDisconnectDefer.promise
    })
  })
})

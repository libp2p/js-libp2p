'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const pDefer = require('p-defer')

const PeerInfo = require('peer-info')
const Topology = require('libp2p-interfaces/src/topology/multicodec-topology')
const PeerStore = require('../../src/peer-store')
const Registrar = require('../../src/registrar')
const { createMockConnection } = require('./utils')
const peerUtils = require('../utils/creators/peer')

const multicodec = '/test/1.0.0'

describe('registrar', () => {
  let peerStore, registrar

  describe('errors', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar({ peerStore })
    })

    it('should fail to register a protocol if no multicodec is provided', () => {
      expect(() => registrar.register()).to.throw()
    })

    it('should fail to register a protocol if an invalid topology is provided', () => {
      const fakeTopology = {
        random: 1
      }
      expect(() => registrar.register(fakeTopology)).to.throw()
    })
  })

  describe('registration', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar({ peerStore })
    })

    it('should be able to register a protocol', () => {
      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        }
      })

      const identifier = registrar.register(topologyProps)

      expect(identifier).to.exist()
    })

    it('should be able to unregister a protocol', () => {
      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        }
      })

      const identifier = registrar.register(topologyProps)
      const success = registrar.unregister(identifier)

      expect(success).to.eql(true)
    })

    it('should fail to unregister if no register was made', () => {
      const success = registrar.unregister('bad-identifier')

      expect(success).to.eql(false)
    })

    it('should call onConnect handler for connected peers after register', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      // Setup connections before registrar
      const conn = await createMockConnection()
      const remotePeerInfo = await PeerInfo.create(conn.remotePeer)

      // Add protocol to peer
      remotePeerInfo.protocols.add(multicodec)

      // Add connected peer to peerStore and registrar
      peerStore.addressBook.set(remotePeerInfo.id, remotePeerInfo.multiaddrs.toArray())
      peerStore.protoBook.set(remotePeerInfo.id, Array.from(remotePeerInfo.protocols))

      registrar.onConnect(remotePeerInfo, conn)
      expect(registrar.connections.size).to.eql(1)

      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: (peerInfo, connection) => {
            expect(peerInfo.id.toB58String()).to.eql(remotePeerInfo.id.toB58String())
            expect(connection.id).to.eql(conn.id)

            onConnectDefer.resolve()
          },
          onDisconnect: (peerInfo) => {
            expect(peerInfo.id.toB58String()).to.eql(remotePeerInfo.id.toB58String())

            onDisconnectDefer.resolve()
          }
        }
      })

      // Register protocol
      const identifier = registrar.register(topologyProps)
      const topology = registrar.topologies.get(identifier)

      // Topology created
      expect(topology).to.exist()

      registrar.onDisconnect(remotePeerInfo)
      expect(registrar.connections.size).to.eql(0)

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
      const identifier = registrar.register(topologyProps)
      const topology = registrar.topologies.get(identifier)

      // Topology created
      expect(topology).to.exist()
      expect(registrar.connections.size).to.eql(0)

      // Setup connections before registrar
      const conn = await createMockConnection()
      const peerInfo = await PeerInfo.create(conn.remotePeer)

      // Add connected peer to peerStore and registrar
      peerStore.addressBook.set(peerInfo.id, peerInfo.multiaddrs.toArray())
      peerStore.protoBook.set(peerInfo.id, Array.from(peerInfo.protocols))

      registrar.onConnect(peerInfo, conn)

      // Add protocol to peer and update it
      peerInfo.protocols.add(multicodec)
      peerStore.addressBook.add(peerInfo.id, peerInfo.multiaddrs.toArray())
      peerStore.protoBook.add(peerInfo.id, Array.from(peerInfo.protocols))

      await onConnectDefer.promise

      // Remove protocol to peer and update it
      peerInfo.protocols.delete(multicodec)

      peerStore.addressBook.set(peerInfo.id, peerInfo.multiaddrs.toArray())
      peerStore.protoBook.set(peerInfo.id, Array.from(peerInfo.protocols))

      await onDisconnectDefer.promise
    })

    it('should filter connections on disconnect, removing the closed one', async () => {
      const onDisconnectDefer = pDefer()

      const topologyProps = new Topology({
        multicodecs: multicodec,
        handlers: {
          onConnect: () => {},
          onDisconnect: () => {
            onDisconnectDefer.resolve()
          }
        }
      })

      // Register protocol
      registrar.register(topologyProps)

      // Setup connections before registrar
      const [localPeer, remotePeer] = await peerUtils.createPeerInfo({ number: 2 })

      const conn1 = await createMockConnection({ localPeer: localPeer.id, remotePeer: remotePeer.id })
      const conn2 = await createMockConnection({ localPeer: localPeer.id, remotePeer: remotePeer.id })
      const peerInfo = await PeerInfo.create(remotePeer.id)
      const id = peerInfo.id.toB58String()

      // Add connection to registrar
      peerStore.addressBook.set(peerInfo.id, peerInfo.multiaddrs.toArray())
      peerStore.protoBook.set(peerInfo.id, Array.from(peerInfo.protocols))
      registrar.onConnect(peerInfo, conn1)
      registrar.onConnect(peerInfo, conn2)

      expect(registrar.connections.get(id).length).to.eql(2)

      conn2._stat.status = 'closed'
      registrar.onDisconnect(peerInfo, conn2)

      const peerConnections = registrar.connections.get(id)
      expect(peerConnections.length).to.eql(1)
      expect(peerConnections[0]._stat.status).to.eql('open')
    })
  })
})

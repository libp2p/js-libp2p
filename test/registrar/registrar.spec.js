'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const pDefer = require('p-defer')
const PeerInfo = require('peer-info')

const PeerStore = require('../../src/peer-store')
const Registrar = require('../../src/registrar')
const { createMockConnection } = require('./utils')

const multicodec = '/test/1.0.0'

describe('registrar', () => {
  let peerStore, registrar

  describe('erros', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar(peerStore)
    })

    it('should fail to register a protocol if no multicodec is provided', () => {
      try {
        registrar.register()
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NO_MULTICODECS')
        return
      }
      throw new Error('should fail to register a protocol if no multicodec is provided')
    })

    it('should fail to register a protocol if no handlers are provided', () => {
      try {
        registrar.register(multicodec)
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NO_HANDLERS')
        return
      }
      throw new Error('should fail to register a protocol if no handlers are provided')
    })

    it('should fail to register a protocol if the onConnect handler is not provided', () => {
      const handlers = {
        onDisconnect: () => { }
      }

      try {
        registrar.register(multicodec, handlers)
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NO_ONCONNECT_HANDLER')
        return
      }
      throw new Error('should fail to register a protocol if the onConnect handler is not provided')
    })

    it('should fail to register a protocol if the onDisconnect handler is not provided', () => {
      const handlers = {
        onConnect: () => { }
      }

      try {
        registrar.register(multicodec, handlers)
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NO_ONDISCONNECT_HANDLER')
        return
      }
      throw new Error('should fail to register a protocol if the onDisconnect handler is not provided')
    })
  })

  describe('registration', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar(peerStore)
    })

    it('should be able to register a protocol', () => {
      const handlers = {
        onConnect: () => { },
        onDisconnect: () => { }
      }

      const identifier = registrar.register(multicodec, handlers)

      expect(identifier).to.exist()
    })

    it('should be able to unregister a protocol', () => {
      const handlers = {
        onConnect: () => { },
        onDisconnect: () => { }
      }

      const identifier = registrar.register(multicodec, handlers)

      registrar.unregister(identifier)
    })

    it('should fail to unregister if no register was made', () => {
      try {
        registrar.unregister('bad-identifier')
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NO_REGISTRAR')
        return
      }
      throw new Error('should fail to unregister if no register was made')
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
      peerStore.put(remotePeerInfo)
      registrar.onConnect(remotePeerInfo, conn)
      expect(registrar.connections.size).to.eql(1)

      const handlers = {
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

      // Register protocol
      const identifier = registrar.register(multicodec, handlers)
      const topology = registrar.multicodecTopologies.get(identifier)

      // Topology created
      expect(topology).to.exist()
      expect(topology.peers.size).to.eql(1)

      registrar.onDisconnect(remotePeerInfo)
      expect(registrar.connections.size).to.eql(0)
      expect(topology.peers.size).to.eql(0)

      // Wait for handlers to be called
      return Promise.all([
        onConnectDefer.promise,
        onDisconnectDefer.promise
      ])
    })

    it('should call onConnect handler after register, once a peer is connected and protocols are updated', async () => {
      const onConnectDefer = pDefer()
      const onDisconnectDefer = pDefer()

      const handlers = {
        onConnect: () => {
          onConnectDefer.resolve()
        },
        onDisconnect: () => {
          onDisconnectDefer.resolve()
        }
      }

      // Register protocol
      const identifier = registrar.register(multicodec, handlers)
      const topology = registrar.multicodecTopologies.get(identifier)

      // Topology created
      expect(topology).to.exist()
      expect(topology.peers.size).to.eql(0)
      expect(registrar.connections.size).to.eql(0)

      // Setup connections before registrar
      const conn = await createMockConnection()
      const initialRemotePeerInfo = await PeerInfo.create(conn.remotePeer)

      // Add connected peer to peerStore and registrar
      peerStore.put(initialRemotePeerInfo)
      registrar.onConnect(initialRemotePeerInfo, conn)

      // Add protocol to peer and update it
      const withProtocolRemotePeerInfo = await PeerInfo.create(conn.remotePeer)
      withProtocolRemotePeerInfo.protocols.add(multicodec)
      peerStore.put(withProtocolRemotePeerInfo)

      await onConnectDefer.promise
      expect(topology.peers.size).to.eql(1)

      // Remove protocol to peer and update it
      const withoutProtocolRemotePeerInfo = await PeerInfo.create(conn.remotePeer)
      withoutProtocolRemotePeerInfo.protocols.delete(multicodec)
      peerStore.put(withoutProtocolRemotePeerInfo)

      await onDisconnectDefer.promise
    })
  })
})

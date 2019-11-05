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

  describe('errors', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar({ peerStore })
    })

    it('should fail to register a protocol if no multicodec is provided', () => {
      try {
        registrar.register()
      } catch (err) {
        expect(err).to.exist()
        return
      }
      throw new Error('should fail to register a protocol if no multicodec is provided')
    })

    it('should fail to register a protocol if no handlers are provided', () => {
      const topologyProps = {
        multicodecs: multicodec
      }

      try {
        registrar.register(topologyProps)
      } catch (err) {
        expect(err).to.exist()
        return
      }
      throw new Error('should fail to register a protocol if no handlers are provided')
    })

    it('should fail to register a protocol if the onConnect handler is not provided', () => {
      const topologyProps = {
        multicodecs: multicodec,
        handlers: {
          onDisconnect: () => { }
        }
      }

      try {
        registrar.register(topologyProps)
      } catch (err) {
        expect(err).to.exist()
        return
      }
      throw new Error('should fail to register a protocol if the onConnect handler is not provided')
    })

    it('should fail to register a protocol if the onDisconnect handler is not provided', () => {
      const topologyProps = {
        multicodecs: multicodec,
        handlers: {
          onConnect: () => { }
        }
      }

      try {
        registrar.register(topologyProps)
      } catch (err) {
        expect(err).to.exist()
        return
      }
      throw new Error('should fail to register a protocol if the onDisconnect handler is not provided')
    })
  })

  describe('registration', () => {
    beforeEach(() => {
      peerStore = new PeerStore()
      registrar = new Registrar({ peerStore })
    })

    it('should be able to register a protocol', () => {
      const topologyProps = {
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        },
        multicodecs: multicodec
      }

      const identifier = registrar.register(topologyProps)

      expect(identifier).to.exist()
    })

    it('should be able to unregister a protocol', () => {
      const topologyProps = {
        handlers: {
          onConnect: () => { },
          onDisconnect: () => { }
        },
        multicodecs: multicodec
      }

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
      peerStore.put(remotePeerInfo)
      registrar.onConnect(remotePeerInfo, conn)
      expect(registrar.connections.size).to.eql(1)

      const topologyProps = {
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
      }

      // Register protocol
      const identifier = registrar.register(topologyProps)
      const topology = registrar.topologies.get(identifier)

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

      const topologyProps = {
        multicodecs: multicodec,
        handlers: {
          onConnect: () => {
            onConnectDefer.resolve()
          },
          onDisconnect: () => {
            onDisconnectDefer.resolve()
          }
        }
      }

      // Register protocol
      const identifier = registrar.register(topologyProps)
      const topology = registrar.topologies.get(identifier)

      // Topology created
      expect(topology).to.exist()
      expect(topology.peers.size).to.eql(0)
      expect(registrar.connections.size).to.eql(0)

      // Setup connections before registrar
      const conn = await createMockConnection()
      const peerInfo = await PeerInfo.create(conn.remotePeer)

      // Add connected peer to peerStore and registrar
      peerStore.put(peerInfo)
      registrar.onConnect(peerInfo, conn)

      // Add protocol to peer and update it
      peerInfo.protocols.add(multicodec)
      peerStore.put(peerInfo)

      await onConnectDefer.promise
      expect(topology.peers.size).to.eql(1)

      // Remove protocol to peer and update it
      peerInfo.protocols.delete(multicodec)
      peerStore.put(peerInfo)

      await onDisconnectDefer.promise
    })
  })
})

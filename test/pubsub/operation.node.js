'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const pWaitFor = require('p-wait-for')
const pDefer = require('p-defer')
const mergeOptions = require('merge-options')
const multiaddr = require('multiaddr')
const uint8ArrayToString = require('uint8arrays/to-string')

const { create } = require('../../src')
const { subsystemOptions, subsystemMulticodecs } = require('./utils')
const peerUtils = require('../utils/creators/peer')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Pubsub subsystem operates correctly', () => {
  let peerId, remotePeerId
  let libp2p, remoteLibp2p

  beforeEach(async () => {
    [peerId, remotePeerId] = await peerUtils.createPeerId({ number: 2 })
  })

  describe('pubsub started before connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerId,
        addresses: {
          listen: [listenAddr]
        }
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerId: remotePeerId,
        addresses: {
          listen: [remoteListenAddr]
        }
      }))

      await Promise.all([
        libp2p.start(),
        remoteLibp2p.start()
      ])

      libp2p.peerStore.addressBook.set(remotePeerId, remoteLibp2p.multiaddrs)
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    afterEach(() => {
      sinon.restore()
    })

    it('should get notified of connected peers on dial', async () => {
      const connection = await libp2p.dialProtocol(remotePeerId, subsystemMulticodecs)

      expect(connection).to.exist()

      return Promise.all([
        pWaitFor(() => libp2p.pubsub.peers.size === 1),
        pWaitFor(() => remoteLibp2p.pubsub.peers.size === 1)
      ])
    })

    it('should receive pubsub messages', async () => {
      const defer = pDefer()
      const topic = 'test-topic'
      const data = 'hey!'
      const libp2pId = libp2p.peerId.toB58String()

      await libp2p.dialProtocol(remotePeerId, subsystemMulticodecs)

      let subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.not.include(topic)

      libp2p.pubsub.subscribe(topic, (msg) => {
        expect(uint8ArrayToString(msg.data)).to.equal(data)
        defer.resolve()
      })

      subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.include(topic)

      // wait for remoteLibp2p to know about libp2p subscription
      await pWaitFor(() => {
        const subscribedPeers = remoteLibp2p.pubsub.getSubscribers(topic)
        return subscribedPeers.includes(libp2pId)
      })
      remoteLibp2p.pubsub.publish(topic, data)

      await defer.promise
    })
  })

  describe('pubsub started after connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerId,
        addresses: {
          listen: [listenAddr]
        }
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerId: remotePeerId,
        addresses: {
          listen: [remoteListenAddr]
        },
        config: {
          pubsub: {
            enabled: false
          }
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      libp2p.peerStore.addressBook.set(remotePeerId, remoteLibp2p.multiaddrs)
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    afterEach(() => {
      sinon.restore()
    })

    it('should get notified of connected peers after starting', async () => {
      const connection = await libp2p.dial(remotePeerId)

      expect(connection).to.exist()
      expect(libp2p.pubsub.peers.size).to.be.eql(0)
      expect(remoteLibp2p.pubsub.peers.size).to.be.eql(0)

      remoteLibp2p.pubsub.start()

      return Promise.all([
        pWaitFor(() => libp2p.pubsub.peers.size === 1),
        pWaitFor(() => remoteLibp2p.pubsub.peers.size === 1)
      ])
    })

    it('should receive pubsub messages', async function () {
      this.timeout(10e3)
      const defer = pDefer()
      const libp2pId = libp2p.peerId.toB58String()
      const topic = 'test-topic'
      const data = 'hey!'

      await libp2p.dial(remotePeerId)

      remoteLibp2p.pubsub.start()

      await Promise.all([
        pWaitFor(() => libp2p.pubsub.peers.size === 1),
        pWaitFor(() => remoteLibp2p.pubsub.peers.size === 1)
      ])

      let subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.not.include(topic)

      libp2p.pubsub.subscribe(topic, (msg) => {
        expect(uint8ArrayToString(msg.data)).to.equal(data)
        defer.resolve()
      })

      subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.include(topic)

      // wait for remoteLibp2p to know about libp2p subscription
      await pWaitFor(() => {
        const subscribedPeers = remoteLibp2p.pubsub.getSubscribers(topic)
        return subscribedPeers.includes(libp2pId)
      })

      remoteLibp2p.pubsub.publish(topic, data)

      await defer.promise
    })
  })

  describe('pubsub with intermittent connections', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerId,
        addresses: {
          listen: [listenAddr]
        },
        config: {
          pubsub: {
            enabled: true,
            emitSelf: false
          }
        }
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerId: remotePeerId,
        addresses: {
          listen: [remoteListenAddr]
        },
        config: {
          pubsub: {
            enabled: true,
            emitSelf: false
          }
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      libp2p.peerStore.addressBook.set(remotePeerId, remoteLibp2p.multiaddrs)
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    afterEach(() => {
      sinon.restore()
    })

    it('should receive pubsub messages after a node restart', async () => {
      const topic = 'test-topic'
      const data = 'hey!'
      const libp2pId = libp2p.peerId.toB58String()

      let counter = 0
      const defer1 = pDefer()
      const defer2 = pDefer()
      const handler = (msg) => {
        expect(uint8ArrayToString(msg.data)).to.equal(data)
        counter++
        counter === 1 ? defer1.resolve() : defer2.resolve()
      }

      await libp2p.dial(remotePeerId)

      let subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.not.include(topic)

      libp2p.pubsub.subscribe(topic, handler)

      subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.include(topic)

      // wait for remoteLibp2p to know about libp2p subscription
      await pWaitFor(() => {
        const subscribedPeers = remoteLibp2p.pubsub.getSubscribers(topic)
        return subscribedPeers.includes(libp2pId)
      })
      remoteLibp2p.pubsub.publish(topic, data)

      await defer1.promise

      await remoteLibp2p.stop()
      await remoteLibp2p.start()

      libp2p.peerStore.addressBook.set(remotePeerId, remoteLibp2p.multiaddrs)
      await libp2p.dial(remotePeerId)

      // wait for remoteLibp2p to know about libp2p subscription
      await pWaitFor(() => {
        const subscribedPeers = remoteLibp2p.pubsub.getSubscribers(topic)
        return subscribedPeers.includes(libp2pId)
      })

      remoteLibp2p.pubsub.publish(topic, data)

      await defer2.promise
    })

    it('should handle quick reconnects with a delayed disconnect', async () => {
      // Subscribe on both
      const handlerSpy = sinon.spy()
      const topic = 'reconnect-channel'
      await Promise.all([
        libp2p.pubsub.subscribe(topic, handlerSpy),
        remoteLibp2p.pubsub.subscribe(topic, handlerSpy)
      ])
      // Create two connections to the remote peer
      const originalConnection = await libp2p.dialer.connectToPeer(remoteLibp2p.peerId)
      // second connection
      await libp2p.dialer.connectToPeer(remoteLibp2p.peerId)
      expect(libp2p.connections.get(remoteLibp2p.peerId.toB58String())).to.have.length(2)

      // Wait for subscriptions to occur
      await pWaitFor(() => {
        return libp2p.pubsub.getSubscribers(topic).includes(remoteLibp2p.peerId.toB58String()) &&
          remoteLibp2p.pubsub.getSubscribers(topic).includes(libp2p.peerId.toB58String())
      })

      // Verify messages go both ways
      libp2p.pubsub.publish(topic, 'message1')
      remoteLibp2p.pubsub.publish(topic, 'message2')
      await pWaitFor(() => handlerSpy.callCount === 2)
      expect(handlerSpy.args.map(([message]) => uint8ArrayToString(message.data))).to.include.members(['message1', 'message2'])

      // Disconnect the first connection (this acts as a delayed reconnect)
      const libp2pConnUpdateSpy = sinon.spy(libp2p.connectionManager.connections, 'set')
      const remoteLibp2pConnUpdateSpy = sinon.spy(remoteLibp2p.connectionManager.connections, 'set')

      await originalConnection.close()
      await pWaitFor(() => libp2pConnUpdateSpy.callCount === 1 && remoteLibp2pConnUpdateSpy.callCount === 1)

      // Verify messages go both ways after the disconnect
      handlerSpy.resetHistory()
      libp2p.pubsub.publish(topic, 'message3')
      remoteLibp2p.pubsub.publish(topic, 'message4')
      await pWaitFor(() => handlerSpy.callCount === 2)
      expect(handlerSpy.args.map(([message]) => uint8ArrayToString(message.data))).to.include.members(['message3', 'message4'])
    })
  })
})

'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const pWaitFor = require('p-wait-for')
const pDefer = require('p-defer')
const mergeOptions = require('merge-options')

const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')

const { create } = require('../../src')
const { subsystemOptions, subsystemMulticodecs } = require('./utils')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Pubsub subsystem operates correctly', () => {
  let peerInfo, remotePeerInfo
  let libp2p, remoteLibp2p
  let remAddr

  beforeEach(async () => {
    [peerInfo, remotePeerInfo] = await Promise.all([
      PeerInfo.create(),
      PeerInfo.create()
    ])

    peerInfo.multiaddrs.add(listenAddr)
    remotePeerInfo.multiaddrs.add(remoteListenAddr)
  })

  describe('pubsub started before connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo: remotePeerInfo
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      remAddr = remoteLibp2p.transportManager.getAddrs()[0]
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    afterEach(() => {
      sinon.restore()
    })

    it('should get notified of connected peers on dial', async () => {
      sinon.spy(libp2p.registrar, 'onConnect')
      sinon.spy(remoteLibp2p.registrar, 'onConnect')

      const connection = await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      expect(connection).to.exist()
      expect(libp2p.pubsub._pubsub.peers.size).to.be.eql(1)
      expect(remoteLibp2p.pubsub._pubsub.peers.size).to.be.eql(1)

      expect(libp2p.registrar.onConnect.callCount).to.equal(1)
      expect(remoteLibp2p.registrar.onConnect.callCount).to.equal(1)
    })

    it('should receive pubsub messages', async () => {
      const defer = pDefer()
      const topic = 'test-topic'
      const data = 'hey!'
      const libp2pId = libp2p.peerInfo.id.toB58String()

      await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      let subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.not.include(topic)

      libp2p.pubsub.subscribe(topic, (msg) => {
        expect(msg.data.toString()).to.equal(data)
        defer.resolve()
      })

      subscribedTopics = libp2p.pubsub.getTopics()
      expect(subscribedTopics).to.include(topic)

      // wait for remoteLibp2p to know about libp2p subscription
      await pWaitFor(() => {
        const subscribedPeers = remoteLibp2p.pubsub.getPeersSubscribed(topic)
        return subscribedPeers.includes(libp2pId)
      })
      remoteLibp2p.pubsub.publish(topic, data)

      await defer.promise
    })
  })

  // TODO: Needs identify push
  describe.skip('pubsub started after connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo: remotePeerInfo,
        config: {
          pubsub: {
            enabled: false
          }
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      remAddr = remoteLibp2p.transportManager.getAddrs()[0]
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    afterEach(() => {
      sinon.restore()
    })

    it.skip('should get notified of connected peers after starting', async () => {
      const connection = await libp2p.dial(remAddr)

      expect(connection).to.exist()
      expect(libp2p.pubsub._pubsub.peers.size).to.be.eql(0)
      expect(remoteLibp2p.pubsub._pubsub.peers.size).to.be.eql(0)

      remoteLibp2p.pubsub.start()

      // Wait for
      // Validate
      expect(libp2p.pubsub._pubsub.peers.size).to.be.eql(1)
      expect(remoteLibp2p.pubsub._pubsub.peers.size).to.be.eql(1)
    })

    it.skip('should receive pubsub messages', async () => {
      const defer = pDefer()
      const topic = 'test-topic'
      const data = 'hey!'

      await libp2p.dial(remAddr)

      remoteLibp2p.pubsub.start()

      // TODO: wait for

      libp2p.pubsub.subscribe(topic)
      libp2p.pubsub.once(topic, (msg) => {
        expect(msg.data.toString()).to.equal(data)
        defer.resolve()
      })

      libp2p.pubsub.publish(topic, data)

      await defer.promise
    })
  })
})

'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const pWaitFor = require('p-wait-for')
const pDefer = require('p-defer')
const mergeOptions = require('merge-options')

const Floodsub = require('libp2p-floodsub')
const Gossipsub = require('libp2p-gossipsub')
const { multicodec: floodsubMulticodec } = require('libp2p-floodsub')
const { multicodec: gossipsubMulticodec } = require('libp2p-gossipsub')
const uint8ArrayToString = require('uint8arrays/to-string')

const { Multiaddr } = require('multiaddr')

const { create } = require('../../src')
const { baseOptions } = require('./utils')
const peerUtils = require('../utils/creators/peer')

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')
const remoteListenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Pubsub subsystem is able to use different implementations', () => {
  let peerId, remotePeerId
  let libp2p, remoteLibp2p

  beforeEach(async () => {
    [peerId, remotePeerId] = await peerUtils.createPeerId({ number: 2 })
  })

  afterEach(() => Promise.all([
    libp2p && libp2p.stop(),
    remoteLibp2p && remoteLibp2p.stop()
  ]))

  it('Floodsub nodes', () => {
    return pubsubTest(floodsubMulticodec, Floodsub)
  })

  it('Gossipsub nodes', () => {
    return pubsubTest(gossipsubMulticodec, Gossipsub)
  })

  const pubsubTest = async (multicodec, pubsub) => {
    const defer = pDefer()
    const topic = 'test-topic'
    const data = 'hey!'

    libp2p = await create(mergeOptions(baseOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      modules: {
        pubsub: pubsub
      }
    }))

    remoteLibp2p = await create(mergeOptions(baseOptions, {
      peerId: remotePeerId,
      addresses: {
        listen: [remoteListenAddr]
      },
      modules: {
        pubsub: pubsub
      }
    }))

    await Promise.all([
      libp2p.start(),
      remoteLibp2p.start()
    ])

    const libp2pId = libp2p.peerId.toB58String()
    libp2p.peerStore.addressBook.set(remotePeerId, remoteLibp2p.multiaddrs)

    const connection = await libp2p.dialProtocol(remotePeerId, multicodec)
    expect(connection).to.exist()

    libp2p.pubsub.subscribe(topic, (msg) => {
      expect(uint8ArrayToString(msg.data)).to.equal(data)
      defer.resolve()
    })

    // wait for remoteLibp2p to know about libp2p subscription
    await pWaitFor(() => {
      const subscribedPeers = remoteLibp2p.pubsub.getSubscribers(topic)
      return subscribedPeers.includes(libp2pId)
    })

    remoteLibp2p.pubsub.publish(topic, data)
    await defer.promise
  }
})

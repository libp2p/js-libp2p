'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const pWaitFor = require('p-wait-for')
const pDefer = require('p-defer')
const mergeOptions = require('merge-options')

const Floodsub = require('libp2p-floodsub')
const Gossipsub = require('libp2p-gossipsub')
const { multicodec: floodsubMulticodec } = require('libp2p-floodsub')
const { multicodec: gossipsubMulticodec } = require('libp2p-gossipsub')

const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')

const { create } = require('../../src')
const { baseOptions } = require('./utils')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Pubsub subsystem is able to use different implementations', () => {
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
      peerInfo,
      modules: {
        pubsub: pubsub
      }
    }))

    remoteLibp2p = await create(mergeOptions(baseOptions, {
      peerInfo: remotePeerInfo,
      modules: {
        pubsub: pubsub
      }
    }))

    await Promise.all([
      libp2p.start(),
      remoteLibp2p.start()
    ])

    const libp2pId = libp2p.peerInfo.id.toB58String()
    remAddr = remoteLibp2p.transportManager.getAddrs()[0]

    const connection = await libp2p.dialProtocol(remAddr, multicodec)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(connection).to.exist()

    libp2p.pubsub.subscribe(topic, (msg) => {
      expect(msg.data.toString()).to.equal(data)
      defer.resolve()
    })

    // wait for remoteLibp2p to know about libp2p subscription
    await pWaitFor(() => {
      const subscribedPeers = remoteLibp2p.pubsub.getPeersSubscribed(topic)
      return subscribedPeers.includes(libp2pId)
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    remoteLibp2p.pubsub.publish(topic, data)

    await defer.promise
  }
})

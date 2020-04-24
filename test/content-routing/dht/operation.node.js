'use strict'
/* eslint-env mocha */

const { Buffer } = require('buffer')
const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const pWaitFor = require('p-wait-for')
const mergeOptions = require('merge-options')
const multiaddr = require('multiaddr')

const { create } = require('../../../src')
const { subsystemOptions, subsystemMulticodecs } = require('./utils')
const peerUtils = require('../../utils/creators/peer')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/8000')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/8001')

describe('DHT subsystem operates correctly', () => {
  let peerInfo, remotePeerInfo
  let libp2p, remoteLibp2p
  let remAddr

  beforeEach(async () => {
    [peerInfo, remotePeerInfo] = await peerUtils.createPeerInfo({ number: 2 })

    peerInfo.multiaddrs.add(listenAddr)
    remotePeerInfo.multiaddrs.add(remoteListenAddr)
  })

  describe('dht started before connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo: remotePeerInfo
      }))

      await Promise.all([
        libp2p.start(),
        remoteLibp2p.start()
      ])

      remAddr = libp2p.peerStore.multiaddrsForPeer(remotePeerInfo)[0]
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    it('should get notified of connected peers on dial', async () => {
      const connection = await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      expect(connection).to.exist()

      return Promise.all([
        pWaitFor(() => libp2p._dht.routingTable.size === 1),
        pWaitFor(() => remoteLibp2p._dht.routingTable.size === 1)
      ])
    })

    it('should put on a peer and get from the other', async () => {
      const key = Buffer.from('hello')
      const value = Buffer.from('world')

      await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      await Promise.all([
        pWaitFor(() => libp2p._dht.routingTable.size === 1),
        pWaitFor(() => remoteLibp2p._dht.routingTable.size === 1)
      ])

      await libp2p.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.contentRouting.get(key)
      expect(fetchedValue).to.eql(value)
    })
  })

  describe('dht started after connect', () => {
    beforeEach(async () => {
      libp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo
      }))

      remoteLibp2p = await create(mergeOptions(subsystemOptions, {
        peerInfo: remotePeerInfo,
        config: {
          dht: {
            enabled: false
          }
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      remAddr = libp2p.peerStore.multiaddrsForPeer(remotePeerInfo)[0]
    })

    afterEach(() => Promise.all([
      libp2p && libp2p.stop(),
      remoteLibp2p && remoteLibp2p.stop()
    ]))

    it('should get notified of connected peers after starting', async () => {
      const connection = await libp2p.dial(remAddr)

      expect(connection).to.exist()
      expect(libp2p._dht.routingTable.size).to.be.eql(0)
      expect(remoteLibp2p._dht.routingTable.size).to.be.eql(0)

      await remoteLibp2p._dht.start()
      return pWaitFor(() => libp2p._dht.routingTable.size === 1)
    })

    it('should put on a peer and get from the other', async () => {
      await libp2p.dial(remAddr)

      const key = Buffer.from('hello')
      const value = Buffer.from('world')

      await remoteLibp2p._dht.start()
      await pWaitFor(() => libp2p._dht.routingTable.size === 1)

      await libp2p.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.contentRouting.get(key)
      expect(fetchedValue).to.eql(value)
    })
  })
})

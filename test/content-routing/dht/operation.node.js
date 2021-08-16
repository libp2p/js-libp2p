'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const { Multiaddr } = require('multiaddr')
const pWaitFor = require('p-wait-for')
const mergeOptions = require('merge-options')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const { create } = require('../../../src')
const { subsystemOptions, subsystemMulticodecs } = require('./utils')
const peerUtils = require('../../utils/creators/peer')

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/8000')
const remoteListenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/8001')

describe('DHT subsystem operates correctly', () => {
  let peerId, remotePeerId
  let libp2p, remoteLibp2p
  let remAddr

  beforeEach(async () => {
    [peerId, remotePeerId] = await peerUtils.createPeerId({ number: 2 })
  })

  describe('dht started before connect', () => {
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

      libp2p.peerStore.addressBook.set(remotePeerId, [remoteListenAddr])
      remAddr = libp2p.peerStore.addressBook.getMultiaddrsForPeer(remotePeerId)[0]
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
      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

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
          dht: {
            enabled: false
          }
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      libp2p.peerStore.addressBook.set(remotePeerId, [remoteListenAddr])
      remAddr = libp2p.peerStore.addressBook.getMultiaddrsForPeer(remotePeerId)[0]
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

      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      await remoteLibp2p._dht.start()
      await pWaitFor(() => libp2p._dht.routingTable.size === 1)

      await libp2p.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.contentRouting.get(key)
      expect(fetchedValue).to.eql(value)
    })
  })
})

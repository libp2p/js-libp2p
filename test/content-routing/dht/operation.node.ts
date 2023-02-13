/* eslint-env mocha */

import { expect } from 'aegir/chai'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import pWaitFor from 'p-wait-for'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { subsystemMulticodecs, createSubsystemOptions } from './utils.js'
import { createPeerId } from '../../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createLibp2pNode, Libp2pNode } from '../../../src/libp2p.js'
import { start } from '@libp2p/interfaces/startable'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/8000')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/8001')

async function getRemoteAddr (remotePeerId: PeerId, libp2p: Libp2pNode) {
  const addrs = await libp2p.components.peerStore.addressBook.get(remotePeerId)

  if (addrs.length === 0) {
    throw new Error('No addrs found')
  }

  const addr = addrs[0]

  return addr.multiaddr.encapsulate(`/p2p/${remotePeerId.toString()}`)
}

describe('DHT subsystem operates correctly', () => {
  let peerId: PeerId, remotePeerId: PeerId
  let libp2p: Libp2pNode, remoteLibp2p: Libp2pNode
  let remAddr: Multiaddr

  beforeEach(async () => {
    [peerId, remotePeerId] = await Promise.all([
      createPeerId(),
      createPeerId()
    ])
  })

  describe('dht started before connect', () => {
    beforeEach(async () => {
      libp2p = await createLibp2pNode(createSubsystemOptions({
        peerId,
        addresses: {
          listen: [listenAddr.toString()]
        }
      }))

      remoteLibp2p = await createLibp2pNode(createSubsystemOptions({
        peerId: remotePeerId,
        addresses: {
          listen: [remoteListenAddr.toString()]
        }
      }))

      await Promise.all([
        libp2p.start(),
        remoteLibp2p.start()
      ])

      await libp2p.components.peerStore.addressBook.set(remotePeerId, [remoteListenAddr])
      remAddr = await getRemoteAddr(remotePeerId, libp2p)
    })

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }

      if (remoteLibp2p != null) {
        await remoteLibp2p.stop()
      }
    })

    it('should get notified of connected peers on dial', async () => {
      const stream = await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      expect(stream).to.exist()

      return await Promise.all([
        pWaitFor(() => libp2p.dht.lan.routingTable.size === 1),
        pWaitFor(() => remoteLibp2p.dht.lan.routingTable.size === 1)
      ])
    })

    it('should put on a peer and get from the other', async () => {
      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      await libp2p.dialProtocol(remAddr, subsystemMulticodecs)
      await Promise.all([
        pWaitFor(() => libp2p.dht.lan.routingTable.size === 1),
        pWaitFor(() => remoteLibp2p.dht.lan.routingTable.size === 1)
      ])

      await libp2p.components.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.components.contentRouting.get(key)
      expect(fetchedValue).to.equalBytes(value)
    })
  })

  describe('dht started after connect', () => {
    beforeEach(async () => {
      libp2p = await createLibp2pNode(createSubsystemOptions({
        peerId,
        addresses: {
          listen: [listenAddr.toString()]
        }
      }))

      remoteLibp2p = await createLibp2pNode(createSubsystemOptions({
        peerId: remotePeerId,
        addresses: {
          listen: [remoteListenAddr.toString()]
        }
      }))

      await libp2p.start()
      await remoteLibp2p.start()

      await libp2p.components.peerStore.addressBook.set(remotePeerId, [remoteListenAddr])
      remAddr = await getRemoteAddr(remotePeerId, libp2p)
    })

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }

      if (remoteLibp2p != null) {
        await remoteLibp2p.stop()
      }
    })

    // TODO: we pre-fill the routing tables on dht startup with artificial peers so this test
    // doesn't really work as intended.  We should be testing that a connected peer can change
    // it's supported protocols and we should notice that change so there may be something to
    // salvage from here, though it could be better as identify protocol tests.
    it.skip('should get notified of connected peers after starting', async () => {
      const connection = await libp2p.dial(remAddr)

      expect(connection).to.exist()
      expect(libp2p.dht.lan.routingTable).to.be.empty()

      const dht = remoteLibp2p.dht

      await start(dht)

      // should be 0 directly after start - TODO this may be susceptible to timing bugs, we should have
      // the ability to report stats on the DHT routing table instead of reaching into it's heart like this
      expect(remoteLibp2p.dht.lan.routingTable).to.be.empty()

      return await pWaitFor(() => libp2p.dht.lan.routingTable.size === 1)
    })

    it('should put on a peer and get from the other', async () => {
      await libp2p.dial(remAddr)

      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      const dht = remoteLibp2p.dht

      await start(dht)

      await pWaitFor(() => libp2p.dht.lan.routingTable.size === 1)
      await libp2p.components.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.components.contentRouting.get(key)
      expect(fetchedValue).to.equalBytes(value)
    })
  })
})

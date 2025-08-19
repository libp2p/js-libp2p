/* eslint-env mocha */

import { createServer } from '@libp2p/daemon-server'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createClient } from '../src/index.js'
import type { DaemonClient } from '../src/index.js'
import type { GossipSub } from '@chainsafe/libp2p-gossipsub'
import type { Libp2pServer } from '@libp2p/daemon-server'
import type { Libp2p } from '@libp2p/interface'
import type { KadDHT } from '@libp2p/kad-dht'
import type { StubbedInstance } from 'sinon-ts'

const defaultMultiaddr = multiaddr('/ip4/0.0.0.0/tcp/12345')

describe('daemon pubsub client', function () {
  this.timeout(30e3)

  let libp2p: StubbedInstance<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>
  let server: Libp2pServer
  let client: DaemonClient
  let pubsub: StubbedInstance<GossipSub>

  beforeEach(async function () {
    pubsub = stubInterface<GossipSub>()
    libp2p = stubInterface<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>()
    libp2p.services.pubsub = pubsub

    server = createServer(defaultMultiaddr, libp2p)

    await server.start()

    client = createClient(server.getMultiaddr())
  })

  afterEach(async () => {
    if (server != null) {
      await server.stop()
    }

    sinon.restore()
  })

  describe('getTopics', () => {
    it('should get empty list of topics when no subscriptions exist', async () => {
      pubsub.getTopics.returns([])

      const topics = await client.pubsub.getTopics()

      expect(topics).to.have.lengthOf(0)
    })

    it('should get a list with a topic when subscribed', async () => {
      const topic = 'test-topic'
      pubsub.getTopics.returns([topic])

      const topics = await client.pubsub.getTopics()

      expect(topics).to.have.lengthOf(1)
      expect(topics[0]).to.equal(topic)
    })

    it('should error if receive an error message', async () => {
      pubsub.getTopics.throws(new Error('Urk!'))

      await expect(client.pubsub.getTopics()).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('publish', () => {
    it('should publish an event', async () => {
      const topic = 'test-topic'
      const data = uint8ArrayFromString('hello world')

      await client.pubsub.publish(topic, data)

      expect(pubsub.publish.called).to.be.true()

      const call = pubsub.publish.getCall(0)

      expect(call).to.have.nested.property('args[0]', topic)
      expect(call).to.have.deep.nested.property('args[1]', data)
    })

    it('should error if receive an error message', async () => {
      const topic = 'test-topic'
      const data = uint8ArrayFromString('hello world')
      pubsub.publish.throws(new Error('Urk!'))

      await expect(client.pubsub.publish(topic, data)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('getSubscribers', () => {
    it('should get empty list of topics when no subscriptions exist', async () => {
      pubsub.getSubscribers.returns([])

      const topic = 'test-topic'
      const topics = await client.pubsub.getSubscribers(topic)

      expect(topics).to.have.lengthOf(0)
    })

    it('should get a list with a peer when subscribed', async () => {
      const topic = 'test-topic'
      const peer = peerIdFromString('12D3KooWKnQbfH5t1XxJW5FBoMGNjmC9LTSbDdRJxtYj2bJV5XfP')
      pubsub.getSubscribers.withArgs(topic).returns([peer])

      const peers = await client.pubsub.getSubscribers(topic)

      expect(peers).to.have.lengthOf(1)
      expect(peers[0].toString()).to.equal(peer.toString())
    })

    it('should error if receive an error message', async () => {
      const topic = 'test-topic'
      pubsub.getSubscribers.throws(new Error('Urk!'))

      await expect(client.pubsub.getSubscribers(topic)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })
})

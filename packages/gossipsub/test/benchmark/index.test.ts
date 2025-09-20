import { itBench } from '@dapplion/benchmark'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import {
  connectPubsubNodes,
  createComponentsArray,
  denseConnect

} from '../utils/create-pubsub.js'
import { awaitEvents, checkReceivedSubscriptions, checkReceivedSubscription } from '../utils/events.js'
import type { GossipSubAndComponents } from '../utils/create-pubsub.js'

describe('heartbeat', function () {
  const topic = 'foobar'
  const numTopic = 70
  const numPeers = 50
  const numPeersPerTopic = 30
  let numLoop = 0

  const getTopic = (i: number): string => {
    return topic + String(i)
  }

  const getTopicPeerIndices = (topic: number): number[] => {
    // peer 0 join all topics
    const peers = [0]
    // topic 0 starts from index 1
    // topic 1 starts from index 2...
    for (let i = 0; i < numPeersPerTopic - 1; i++) {
      const peerIndex = (i + topic + 1) % numPeers
      if (peerIndex !== 0) { peers.push(peerIndex) }
    }
    return peers
  }

  /**
   * Star topology
   * peer 1
   * /
   * peer 0  - peer 2
   * \
   * peer 3
   *
   * A topic contains peer 0 and some other peers, with numPeersPerTopic = 4
   *
   * |Topic|    Peers  |
   * |-----|-----------|
   * |  0  | 0, 1, 2, 3|
   * |  1  | 0, 2, 3, 4|
   */
  itBench({
    id: 'heartbeat',
    before: async () => {
      const psubs = await createComponentsArray({
        number: numPeers,
        init: {
          scoreParams: {
            IPColocationFactorWeight: 0
          },
          floodPublish: true,
          // TODO: why we need to configure this low score
          // probably we should tweak topic score params
          // is that why we don't have mesh peers?
          scoreThresholds: {
            gossipThreshold: -10,
            publishThreshold: -100,
            graylistThreshold: -1000
          }
        }
      })

      // build the star
      await Promise.all(psubs.slice(1).map(async (ps) => connectPubsubNodes(psubs[0], ps)))
      await Promise.all(psubs.map(async (ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

      await denseConnect(psubs)

      // make sure psub 0 has `numPeers - 1` peers
      expect(psubs[0].pubsub.getPeers().length).to.be.gte(
        numPeers - 1,
        `peer 0 should have at least ${numPeers - 1} peers`
      )

      const peerIds = psubs.map((psub) => psub.components.peerId.toString())
      for (let topicIndex = 0; topicIndex < numTopic; topicIndex++) {
        const topic = getTopic(topicIndex)
        psubs.forEach((ps) => { ps.pubsub.subscribe(topic) })
        const peerIndices = getTopicPeerIndices(topicIndex)
        const peerIdsOnTopic = peerIndices.map((peerIndex) => peerIds[peerIndex])
        // peer 0 see all subscriptions from other
        const subscription = checkReceivedSubscriptions(psubs[0], peerIdsOnTopic, topic)
        // other peers should see the subsription from peer 0 to prevent PublishError.InsufficientPeers error
        const otherSubscriptions = peerIndices
          .slice(1)
          .map((peerIndex) => psubs[peerIndex])
          .map(async (psub) => checkReceivedSubscription(psub, peerIds[0], topic, 0))
        peerIndices.forEach((peerIndex) => { psubs[peerIndex].pubsub.subscribe(topic) })
        await Promise.all([subscription, ...otherSubscriptions])
      }

      // wait for heartbeats to build mesh
      await Promise.all(psubs.map(async (ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 3)))

      // make sure psubs 0 have at least 10 topic peers and 4 mesh peers for each topic
      for (let i = 0; i < numTopic; i++) {
        expect((psubs[0].pubsub).getSubscribers(getTopic(i)).length).to.be.gte(
          10,
          `psub 0: topic ${i} does not have enough topic peers`
        )

        expect((psubs[0].pubsub).getMeshPeers(getTopic(i)).length).to.be.gte(
          4,
          `psub 0: topic ${i} does not have enough mesh peers`
        )
      }

      return psubs
    },
    beforeEach: async (psubs) => {
      numLoop++
      const msg = `its not a flooooood ${numLoop}`
      const promises = []
      for (let topicIndex = 0; topicIndex < numTopic; topicIndex++) {
        for (const peerIndex of getTopicPeerIndices(topicIndex)) {
          promises.push(
            psubs[peerIndex].pubsub.publish(
              getTopic(topicIndex),
              uint8ArrayFromString(psubs[peerIndex].components.peerId.toString() + msg)
            )
          )
        }
      }
      await Promise.all(promises)

      return psubs[0]
    },
    fn: async (firstPsub: GossipSubAndComponents) => {
      return (firstPsub.pubsub).heartbeat()
    }
  })
})

import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { runBenchmark } from '../utils/benchmark.ts'
import {
  connectPubsubNodes,
  createComponentsArray,
  denseConnect

} from '../utils/create-pubsub.ts'
import { awaitEvents, checkReceivedSubscriptions, checkReceivedSubscription } from '../utils/events.ts'

describe('heartbeat', function () {
  const topic = 'foobar'
  const numTopic = 70
  const numPeers = 50
  const numPeersPerTopic = 30

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
  it('heartbeat', async () => {
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

    // publish one round of messages so the measured heartbeat has gossip to emit
    const msg = 'its not a flooooood'
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

    // measure heartbeat() in isolation — the publish round above is excluded from the timing
    await runBenchmark('heartbeat', async () => {
      await psubs[0].pubsub.heartbeat()
    })

    // stop the nodes so their heartbeat timers don't keep the process alive
    await Promise.allSettled(psubs.map(async (ps) => ps.pubsub.stop()))
  })
})

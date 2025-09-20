import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { ScorePenalty } from '../src/metrics.js'
import { createPeerScoreParams, createTopicScoreParams, PeerScore } from '../src/score/index.js'
import { computeAllPeersScoreWeights } from '../src/score/scoreMetrics.js'

describe('score / scoreMetrics', () => {
  const logger = defaultLogger()

  it('computeScoreWeights', async () => {
    // Create parameters with reasonable default values
    const topic = 'test_topic'

    const params = createPeerScoreParams({
      topicScoreCap: 1000
    })
    params.topics[topic] = createTopicScoreParams({
      topicWeight: 0.5,
      timeInMeshWeight: 1,
      timeInMeshQuantum: 1,
      timeInMeshCap: 3600
    })

    // Add Map for metrics
    const topicStrToLabel = new Map<string, string>()
    topicStrToLabel.set(topic, topic)

    const peerA = peerIdFromPrivateKey(await generateKeyPair('Ed25519')).toString()
    // Peer score should start at 0
    const ps = new PeerScore(params, null, logger, { scoreCacheValidityMs: 0 })
    ps.addPeer(peerA)

    // Do some actions that penalize the peer
    const msgId = 'aaaaaaaaaaaaaaaa'
    ps.addPenalty(peerA, 1, ScorePenalty.BrokenPromise)
    ps.validateMessage(msgId)
    ps.deliverMessage(peerA, msgId, topic)

    const sw = computeAllPeersScoreWeights([peerA], ps.peerStats, ps.params, ps.peerIPs, topicStrToLabel)

    // Ensure score is the same
    expect(sw.score).to.deep.equal([ps.score(peerA)], 'Score from metrics and actual score not equal')
    expect(sw.byTopic.get(topic)).to.deep.equal(
      { p1w: [0], p2w: [1], p3w: [0], p3bw: [0], p4w: [0] },
      'Wrong score weights by topic'
    )
  })
})

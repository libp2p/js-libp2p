import type { PeerStats } from './peer-stats.js'
import type { PeerScoreParams } from './peer-score-params.js'

export function computeScore(
  peer: string,
  pstats: PeerStats,
  params: PeerScoreParams,
  peerIPs: Map<string, Set<string>>
): number {
  let score = 0

  // topic stores
  Object.entries(pstats.topics).forEach(([topic, tstats]) => {
    // the topic parameters
    const topicParams = params.topics[topic]
    if (topicParams === undefined) {
      // we are not scoring this topic
      return
    }

    let topicScore = 0

    // P1: time in Mesh
    if (tstats.inMesh) {
      let p1 = tstats.meshTime / topicParams.timeInMeshQuantum
      if (p1 > topicParams.timeInMeshCap) {
        p1 = topicParams.timeInMeshCap
      }
      topicScore += p1 * topicParams.timeInMeshWeight
    }

    // P2: first message deliveries
    let p2 = tstats.firstMessageDeliveries
    if (p2 > topicParams.firstMessageDeliveriesCap) {
      p2 = topicParams.firstMessageDeliveriesCap
    }
    topicScore += p2 * topicParams.firstMessageDeliveriesWeight

    // P3: mesh message deliveries
    if (
      tstats.meshMessageDeliveriesActive &&
      tstats.meshMessageDeliveries < topicParams.meshMessageDeliveriesThreshold
    ) {
      const deficit = topicParams.meshMessageDeliveriesThreshold - tstats.meshMessageDeliveries
      const p3 = deficit * deficit
      topicScore += p3 * topicParams.meshMessageDeliveriesWeight
    }

    // P3b:
    // NOTE: the weight of P3b is negative (validated in validateTopicScoreParams) so this detracts
    const p3b = tstats.meshFailurePenalty
    topicScore += p3b * topicParams.meshFailurePenaltyWeight

    // P4: invalid messages
    // NOTE: the weight of P4 is negative (validated in validateTopicScoreParams) so this detracts
    const p4 = tstats.invalidMessageDeliveries * tstats.invalidMessageDeliveries
    topicScore += p4 * topicParams.invalidMessageDeliveriesWeight

    // update score, mixing with topic weight
    score += topicScore * topicParams.topicWeight
  })

  // apply the topic score cap, if any
  if (params.topicScoreCap > 0 && score > params.topicScoreCap) {
    score = params.topicScoreCap
  }

  // P5: application-specific score
  const p5 = params.appSpecificScore(peer)
  score += p5 * params.appSpecificWeight

  // P6: IP colocation factor
  pstats.knownIPs.forEach((ip) => {
    if (params.IPColocationFactorWhitelist.has(ip)) {
      return
    }

    // P6 has a cliff (IPColocationFactorThreshold)
    // It's only applied if at least that many peers are connected to us from that source IP addr.
    // It is quadratic, and the weight is negative (validated in validatePeerScoreParams)
    const peersInIP = peerIPs.get(ip)
    const numPeersInIP = peersInIP ? peersInIP.size : 0
    if (numPeersInIP > params.IPColocationFactorThreshold) {
      const surplus = numPeersInIP - params.IPColocationFactorThreshold
      const p6 = surplus * surplus
      score += p6 * params.IPColocationFactorWeight
    }
  })

  // P7: behavioural pattern penalty
  if (pstats.behaviourPenalty > params.behaviourPenaltyThreshold) {
    const excess = pstats.behaviourPenalty - params.behaviourPenaltyThreshold
    const p7 = excess * excess
    score += p7 * params.behaviourPenaltyWeight
  }

  return score
}

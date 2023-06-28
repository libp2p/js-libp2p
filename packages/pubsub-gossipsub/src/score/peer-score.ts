import { PeerScoreParams, validatePeerScoreParams } from './peer-score-params.js'
import type { PeerStats, TopicStats } from './peer-stats.js'
import { computeScore } from './compute-score.js'
import { MessageDeliveries, DeliveryRecordStatus } from './message-deliveries.js'
import { logger } from '@libp2p/logger'
import { MsgIdStr, PeerIdStr, RejectReason, TopicStr, IPStr } from '../types.js'
import type { Metrics, ScorePenalty } from '../metrics.js'
import { MapDef } from '../utils/set.js'

const log = logger('libp2p:gossipsub:score')

interface PeerScoreOpts {
  /**
   * Miliseconds to cache computed score per peer
   */
  scoreCacheValidityMs: number

  computeScore?: typeof computeScore
}

interface ScoreCacheEntry {
  /** The cached score */
  score: number
  /** Unix timestamp in miliseconds, the time after which the cached score for a peer is no longer valid */
  cacheUntil: number
}

export type PeerScoreStatsDump = Record<PeerIdStr, PeerStats>

export class PeerScore {
  /**
   * Per-peer stats for score calculation
   */
  readonly peerStats = new Map<PeerIdStr, PeerStats>()
  /**
   * IP colocation tracking; maps IP => set of peers.
   */
  readonly peerIPs = new MapDef<PeerIdStr, Set<IPStr>>(() => new Set())
  /**
   * Cache score up to decayInterval if topic stats are unchanged.
   */
  readonly scoreCache = new Map<PeerIdStr, ScoreCacheEntry>()
  /**
   * Recent message delivery timing/participants
   */
  readonly deliveryRecords = new MessageDeliveries()

  _backgroundInterval?: ReturnType<typeof setInterval>

  private readonly scoreCacheValidityMs: number
  private readonly computeScore: typeof computeScore

  constructor(readonly params: PeerScoreParams, private readonly metrics: Metrics | null, opts: PeerScoreOpts) {
    validatePeerScoreParams(params)
    this.scoreCacheValidityMs = opts.scoreCacheValidityMs
    this.computeScore = opts.computeScore ?? computeScore
  }

  get size(): number {
    return this.peerStats.size
  }

  /**
   * Start PeerScore instance
   */
  start(): void {
    if (this._backgroundInterval) {
      log('Peer score already running')
      return
    }
    this._backgroundInterval = setInterval(() => this.background(), this.params.decayInterval)
    log('started')
  }

  /**
   * Stop PeerScore instance
   */
  stop(): void {
    if (!this._backgroundInterval) {
      log('Peer score already stopped')
      return
    }
    clearInterval(this._backgroundInterval)
    delete this._backgroundInterval
    this.peerIPs.clear()
    this.peerStats.clear()
    this.deliveryRecords.clear()
    log('stopped')
  }

  /**
   * Periodic maintenance
   */
  background(): void {
    this.refreshScores()
    this.deliveryRecords.gc()
  }

  dumpPeerScoreStats(): PeerScoreStatsDump {
    return Object.fromEntries(Array.from(this.peerStats.entries()).map(([peer, stats]) => [peer, stats]))
  }

  messageFirstSeenTimestampMs(msgIdStr: MsgIdStr): number | null {
    const drec = this.deliveryRecords.getRecord(msgIdStr)
    return drec ? drec.firstSeenTsMs : null
  }

  /**
   * Decays scores, and purges score records for disconnected peers once their expiry has elapsed.
   */
  public refreshScores(): void {
    const now = Date.now()
    const decayToZero = this.params.decayToZero

    this.peerStats.forEach((pstats, id) => {
      if (!pstats.connected) {
        // has the retention period expired?
        if (now > pstats.expire) {
          // yes, throw it away (but clean up the IP tracking first)
          this.removeIPsForPeer(id, pstats.knownIPs)
          this.peerStats.delete(id)
          this.scoreCache.delete(id)
        }

        // we don't decay retained scores, as the peer is not active.
        // this way the peer cannot reset a negative score by simply disconnecting and reconnecting,
        // unless the retention period has elapsed.
        // similarly, a well behaved peer does not lose its score by getting disconnected.
        return
      }

      Object.entries(pstats.topics).forEach(([topic, tstats]) => {
        const tparams = this.params.topics[topic]
        if (tparams === undefined) {
          // we are not scoring this topic
          // should be unreachable, we only add scored topics to pstats
          return
        }

        // decay counters
        tstats.firstMessageDeliveries *= tparams.firstMessageDeliveriesDecay
        if (tstats.firstMessageDeliveries < decayToZero) {
          tstats.firstMessageDeliveries = 0
        }

        tstats.meshMessageDeliveries *= tparams.meshMessageDeliveriesDecay
        if (tstats.meshMessageDeliveries < decayToZero) {
          tstats.meshMessageDeliveries = 0
        }

        tstats.meshFailurePenalty *= tparams.meshFailurePenaltyDecay
        if (tstats.meshFailurePenalty < decayToZero) {
          tstats.meshFailurePenalty = 0
        }

        tstats.invalidMessageDeliveries *= tparams.invalidMessageDeliveriesDecay
        if (tstats.invalidMessageDeliveries < decayToZero) {
          tstats.invalidMessageDeliveries = 0
        }

        // update mesh time and activate mesh message delivery parameter if need be
        if (tstats.inMesh) {
          tstats.meshTime = now - tstats.graftTime
          if (tstats.meshTime > tparams.meshMessageDeliveriesActivation) {
            tstats.meshMessageDeliveriesActive = true
          }
        }
      })

      // decay P7 counter
      pstats.behaviourPenalty *= this.params.behaviourPenaltyDecay
      if (pstats.behaviourPenalty < decayToZero) {
        pstats.behaviourPenalty = 0
      }
    })
  }

  /**
   * Return the score for a peer
   */
  score(id: PeerIdStr): number {
    this.metrics?.scoreFnCalls.inc()

    const pstats = this.peerStats.get(id)
    if (!pstats) {
      return 0
    }

    const now = Date.now()
    const cacheEntry = this.scoreCache.get(id)

    // Found cached score within validity period
    if (cacheEntry && cacheEntry.cacheUntil > now) {
      return cacheEntry.score
    }

    this.metrics?.scoreFnRuns.inc()

    const score = this.computeScore(id, pstats, this.params, this.peerIPs)
    const cacheUntil = now + this.scoreCacheValidityMs

    if (cacheEntry) {
      this.metrics?.scoreCachedDelta.observe(Math.abs(score - cacheEntry.score))
      cacheEntry.score = score
      cacheEntry.cacheUntil = cacheUntil
    } else {
      this.scoreCache.set(id, { score, cacheUntil })
    }

    return score
  }

  /**
   * Apply a behavioural penalty to a peer
   */
  addPenalty(id: PeerIdStr, penalty: number, penaltyLabel: ScorePenalty): void {
    const pstats = this.peerStats.get(id)
    if (pstats) {
      pstats.behaviourPenalty += penalty
      this.metrics?.onScorePenalty(penaltyLabel)
    }
  }

  addPeer(id: PeerIdStr): void {
    // create peer stats (not including topic stats for each topic to be scored)
    // topic stats will be added as needed
    const pstats: PeerStats = {
      connected: true,
      expire: 0,
      topics: {},
      knownIPs: new Set(),
      behaviourPenalty: 0
    }
    this.peerStats.set(id, pstats)
  }

  /** Adds a new IP to a peer, if the peer is not known the update is ignored */
  addIP(id: PeerIdStr, ip: string): void {
    const pstats = this.peerStats.get(id)
    if (pstats) {
      pstats.knownIPs.add(ip)
    }

    this.peerIPs.getOrDefault(ip).add(id)
  }

  /** Remove peer association with IP */
  removeIP(id: PeerIdStr, ip: string): void {
    const pstats = this.peerStats.get(id)
    if (pstats) {
      pstats.knownIPs.delete(ip)
    }

    const peersWithIP = this.peerIPs.get(ip)
    if (peersWithIP) {
      peersWithIP.delete(id)
      if (peersWithIP.size === 0) {
        this.peerIPs.delete(ip)
      }
    }
  }

  removePeer(id: PeerIdStr): void {
    const pstats = this.peerStats.get(id)
    if (!pstats) {
      return
    }

    // decide whether to retain the score; this currently only retains non-positive scores
    // to dissuade attacks on the score function.
    if (this.score(id) > 0) {
      this.removeIPsForPeer(id, pstats.knownIPs)
      this.peerStats.delete(id)
      return
    }

    // furthermore, when we decide to retain the score, the firstMessageDelivery counters are
    // reset to 0 and mesh delivery penalties applied.
    Object.entries(pstats.topics).forEach(([topic, tstats]) => {
      tstats.firstMessageDeliveries = 0

      const threshold = this.params.topics[topic].meshMessageDeliveriesThreshold
      if (tstats.inMesh && tstats.meshMessageDeliveriesActive && tstats.meshMessageDeliveries < threshold) {
        const deficit = threshold - tstats.meshMessageDeliveries
        tstats.meshFailurePenalty += deficit * deficit
      }

      tstats.inMesh = false
      tstats.meshMessageDeliveriesActive = false
    })

    pstats.connected = false
    pstats.expire = Date.now() + this.params.retainScore
  }

  /** Handles scoring functionality as a peer GRAFTs to a topic. */
  graft(id: PeerIdStr, topic: TopicStr): void {
    const pstats = this.peerStats.get(id)
    if (pstats) {
      const tstats = this.getPtopicStats(pstats, topic)
      if (tstats) {
        // if we are scoring the topic, update the mesh status.
        tstats.inMesh = true
        tstats.graftTime = Date.now()
        tstats.meshTime = 0
        tstats.meshMessageDeliveriesActive = false
      }
    }
  }

  /** Handles scoring functionality as a peer PRUNEs from a topic. */
  prune(id: PeerIdStr, topic: TopicStr): void {
    const pstats = this.peerStats.get(id)
    if (pstats) {
      const tstats = this.getPtopicStats(pstats, topic)
      if (tstats) {
        // sticky mesh delivery rate failure penalty
        const threshold = this.params.topics[topic].meshMessageDeliveriesThreshold
        if (tstats.meshMessageDeliveriesActive && tstats.meshMessageDeliveries < threshold) {
          const deficit = threshold - tstats.meshMessageDeliveries
          tstats.meshFailurePenalty += deficit * deficit
        }
        tstats.meshMessageDeliveriesActive = false
        tstats.inMesh = false

        // TODO: Consider clearing score cache on important penalties
        // this.scoreCache.delete(id)
      }
    }
  }

  validateMessage(msgIdStr: MsgIdStr): void {
    this.deliveryRecords.ensureRecord(msgIdStr)
  }

  deliverMessage(from: PeerIdStr, msgIdStr: MsgIdStr, topic: TopicStr): void {
    this.markFirstMessageDelivery(from, topic)

    const drec = this.deliveryRecords.ensureRecord(msgIdStr)
    const now = Date.now()

    // defensive check that this is the first delivery trace -- delivery status should be unknown
    if (drec.status !== DeliveryRecordStatus.unknown) {
      log(
        'unexpected delivery: message from %s was first seen %s ago and has delivery status %s',
        from,
        now - drec.firstSeenTsMs,
        DeliveryRecordStatus[drec.status]
      )
      return
    }

    // mark the message as valid and reward mesh peers that have already forwarded it to us
    drec.status = DeliveryRecordStatus.valid
    drec.validated = now
    drec.peers.forEach((p) => {
      // this check is to make sure a peer can't send us a message twice and get a double count
      // if it is a first delivery.
      if (p !== from.toString()) {
        this.markDuplicateMessageDelivery(p, topic)
      }
    })
  }

  /**
   * Similar to `rejectMessage` except does not require the message id or reason for an invalid message.
   */
  rejectInvalidMessage(from: PeerIdStr, topic: TopicStr): void {
    this.markInvalidMessageDelivery(from, topic)
  }

  rejectMessage(from: PeerIdStr, msgIdStr: MsgIdStr, topic: TopicStr, reason: RejectReason): void {
    switch (reason) {
      // these messages are not tracked, but the peer is penalized as they are invalid
      case RejectReason.Error:
        this.markInvalidMessageDelivery(from, topic)
        return

      // we ignore those messages, so do nothing.
      case RejectReason.Blacklisted:
        return

      // the rest are handled after record creation
    }

    const drec = this.deliveryRecords.ensureRecord(msgIdStr)

    // defensive check that this is the first rejection -- delivery status should be unknown
    if (drec.status !== DeliveryRecordStatus.unknown) {
      log(
        'unexpected rejection: message from %s was first seen %s ago and has delivery status %d',
        from,
        Date.now() - drec.firstSeenTsMs,
        DeliveryRecordStatus[drec.status]
      )
      return
    }

    if (reason === RejectReason.Ignore) {
      // we were explicitly instructed by the validator to ignore the message but not penalize the peer
      drec.status = DeliveryRecordStatus.ignored
      drec.peers.clear()
      return
    }

    // mark the message as invalid and penalize peers that have already forwarded it.
    drec.status = DeliveryRecordStatus.invalid

    this.markInvalidMessageDelivery(from, topic)
    drec.peers.forEach((p) => {
      this.markInvalidMessageDelivery(p, topic)
    })

    // release the delivery time tracking map to free some memory early
    drec.peers.clear()
  }

  duplicateMessage(from: PeerIdStr, msgIdStr: MsgIdStr, topic: TopicStr): void {
    const drec = this.deliveryRecords.ensureRecord(msgIdStr)

    if (drec.peers.has(from)) {
      // we have already seen this duplicate
      return
    }

    switch (drec.status) {
      case DeliveryRecordStatus.unknown:
        // the message is being validated; track the peer delivery and wait for
        // the Deliver/Reject/Ignore notification.
        drec.peers.add(from)
        break

      case DeliveryRecordStatus.valid:
        // mark the peer delivery time to only count a duplicate delivery once.
        drec.peers.add(from)
        this.markDuplicateMessageDelivery(from, topic, drec.validated)
        break

      case DeliveryRecordStatus.invalid:
        // we no longer track delivery time
        this.markInvalidMessageDelivery(from, topic)
        break

      case DeliveryRecordStatus.ignored:
        // the message was ignored; do nothing (we don't know if it was valid)
        break
    }
  }

  /**
   * Increments the "invalid message deliveries" counter for all scored topics the message is published in.
   */
  public markInvalidMessageDelivery(from: PeerIdStr, topic: TopicStr): void {
    const pstats = this.peerStats.get(from)
    if (pstats) {
      const tstats = this.getPtopicStats(pstats, topic)
      if (tstats) {
        tstats.invalidMessageDeliveries += 1
      }
    }
  }

  /**
   * Increments the "first message deliveries" counter for all scored topics the message is published in,
   * as well as the "mesh message deliveries" counter, if the peer is in the mesh for the topic.
   * Messages already known (with the seenCache) are counted with markDuplicateMessageDelivery()
   */
  public markFirstMessageDelivery(from: PeerIdStr, topic: TopicStr): void {
    const pstats = this.peerStats.get(from)
    if (pstats) {
      const tstats = this.getPtopicStats(pstats, topic)
      if (tstats) {
        let cap = this.params.topics[topic].firstMessageDeliveriesCap
        tstats.firstMessageDeliveries = Math.min(cap, tstats.firstMessageDeliveries + 1)

        if (tstats.inMesh) {
          cap = this.params.topics[topic].meshMessageDeliveriesCap
          tstats.meshMessageDeliveries = Math.min(cap, tstats.meshMessageDeliveries + 1)
        }
      }
    }
  }

  /**
   * Increments the "mesh message deliveries" counter for messages we've seen before,
   * as long the message was received within the P3 window.
   */
  public markDuplicateMessageDelivery(from: PeerIdStr, topic: TopicStr, validatedTime?: number): void {
    const pstats = this.peerStats.get(from)
    if (pstats) {
      const now = validatedTime !== undefined ? Date.now() : 0

      const tstats = this.getPtopicStats(pstats, topic)
      if (tstats && tstats.inMesh) {
        const tparams = this.params.topics[topic]

        // check against the mesh delivery window -- if the validated time is passed as 0, then
        // the message was received before we finished validation and thus falls within the mesh
        // delivery window.
        if (validatedTime !== undefined) {
          const deliveryDelayMs = now - validatedTime
          const isLateDelivery = deliveryDelayMs > tparams.meshMessageDeliveriesWindow
          this.metrics?.onDuplicateMsgDelivery(topic, deliveryDelayMs, isLateDelivery)

          if (isLateDelivery) {
            return
          }
        }

        const cap = tparams.meshMessageDeliveriesCap
        tstats.meshMessageDeliveries = Math.min(cap, tstats.meshMessageDeliveries + 1)
      }
    }
  }

  /**
   * Removes an IP list from the tracking list for a peer.
   */
  private removeIPsForPeer(id: PeerIdStr, ipsToRemove: Set<IPStr>): void {
    for (const ipToRemove of ipsToRemove) {
      const peerSet = this.peerIPs.get(ipToRemove)
      if (peerSet) {
        peerSet.delete(id)
        if (peerSet.size === 0) {
          this.peerIPs.delete(ipToRemove)
        }
      }
    }
  }

  /**
   * Returns topic stats if they exist, otherwise if the supplied parameters score the
   * topic, inserts the default stats and returns a reference to those. If neither apply, returns None.
   */
  private getPtopicStats(pstats: PeerStats, topic: TopicStr): TopicStats | null {
    let topicStats: TopicStats | undefined = pstats.topics[topic]

    if (topicStats !== undefined) {
      return topicStats
    }

    if (this.params.topics[topic] !== undefined) {
      topicStats = {
        inMesh: false,
        graftTime: 0,
        meshTime: 0,
        firstMessageDeliveries: 0,
        meshMessageDeliveries: 0,
        meshMessageDeliveriesActive: false,
        meshFailurePenalty: 0,
        invalidMessageDeliveries: 0
      }
      pstats.topics[topic] = topicStats

      return topicStats
    }

    return null
  }
}

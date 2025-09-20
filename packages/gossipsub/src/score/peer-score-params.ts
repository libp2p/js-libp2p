import { InvalidPeerScoreParamsError } from '../errors.js'

// This file defines PeerScoreParams and TopicScoreParams interfaces
// as well as constructors, default constructors, and validation functions
// for these interfaces

export interface PeerScoreParams {
  /**
   * Score parameters per topic.
   */
  topics: Record<string, TopicScoreParams>

  /**
   * Aggregate topic score cap; this limits the total contribution of topics towards a positive
   * score. It must be positive (or 0 for no cap).
   */
  topicScoreCap: number

  /**
   * P5: Application-specific peer scoring
   */
  appSpecificScore(p: string): number
  appSpecificWeight: number

  /**
   * P6: IP-colocation factor.
   * The parameter has an associated counter which counts the number of peers with the same IP.
   * If the number of peers in the same IP exceeds IPColocationFactorThreshold, then the value
   * is the square of the difference, ie (PeersInSameIP - IPColocationThreshold)^2.
   * If the number of peers in the same IP is less than the threshold, then the value is 0.
   * The weight of the parameter MUST be negative, unless you want to disable for testing.
   * Note: In order to simulate many IPs in a managable manner when testing, you can set the weight to 0
   * thus disabling the IP colocation penalty.
   */
  IPColocationFactorWeight: number
  IPColocationFactorThreshold: number
  IPColocationFactorWhitelist: Set<string>

  /**
   * P7: behavioural pattern penalties.
   * This parameter has an associated counter which tracks misbehaviour as detected by the
   * router. The router currently applies penalties for the following behaviors:
   * - attempting to re-graft before the prune backoff time has elapsed.
   * - not following up in IWANT requests for messages advertised with IHAVE.
   *
   * The value of the parameter is the square of the counter, which decays with  BehaviourPenaltyDecay.
   * The weight of the parameter MUST be negative (or zero to disable).
   */
  behaviourPenaltyWeight: number
  behaviourPenaltyThreshold: number
  behaviourPenaltyDecay: number

  /**
   * the decay interval for parameter counters.
   */
  decayInterval: number

  /**
   * counter value below which it is considered 0.
   */
  decayToZero: number

  /**
   * time to remember counters for a disconnected peer.
   */
  retainScore: number
}

export interface TopicScoreParams {
  /**
   * The weight of the topic.
   */
  topicWeight: number

  /**
   * P1: time in the mesh
   * This is the time the peer has ben grafted in the mesh.
   * The value of the parameter is the time/TimeInMeshQuantum, capped by TimeInMeshCap
   * The weight of the parameter MUST be positive (or zero to disable).
   */
  timeInMeshWeight: number
  timeInMeshQuantum: number
  timeInMeshCap: number

  /**
   * P2: first message deliveries
   * This is the number of message deliveries in the topic.
   * The value of the parameter is a counter, decaying with FirstMessageDeliveriesDecay, and capped
   * by FirstMessageDeliveriesCap.
   * The weight of the parameter MUST be positive (or zero to disable).
   */
  firstMessageDeliveriesWeight: number
  firstMessageDeliveriesDecay: number
  firstMessageDeliveriesCap: number

  /**
   * P3: mesh message deliveries
   * This is the number of message deliveries in the mesh, within the MeshMessageDeliveriesWindow of
   * message validation; deliveries during validation also count and are retroactively applied
   * when validation succeeds.
   * This window accounts for the minimum time before a hostile mesh peer trying to game the score
   * could replay back a valid message we just sent them.
   * It effectively tracks first and near-first deliveries, ie a message seen from a mesh peer
   * before we have forwarded it to them.
   * The parameter has an associated counter, decaying with MeshMessageDeliveriesDecay.
   * If the counter exceeds the threshold, its value is 0.
   * If the counter is below the MeshMessageDeliveriesThreshold, the value is the square of
   * the deficit, ie (MessageDeliveriesThreshold - counter)^2
   * The penalty is only activated after MeshMessageDeliveriesActivation time in the mesh.
   * The weight of the parameter MUST be negative (or zero to disable).
   */
  meshMessageDeliveriesWeight: number
  meshMessageDeliveriesDecay: number
  meshMessageDeliveriesCap: number
  meshMessageDeliveriesThreshold: number
  meshMessageDeliveriesWindow: number
  meshMessageDeliveriesActivation: number

  /**
   * P3b: sticky mesh propagation failures
   * This is a sticky penalty that applies when a peer gets pruned from the mesh with an active
   * mesh message delivery penalty.
   * The weight of the parameter MUST be negative (or zero to disable)
   */
  meshFailurePenaltyWeight: number
  meshFailurePenaltyDecay: number

  /**
   * P4: invalid messages
   * This is the number of invalid messages in the topic.
   * The value of the parameter is the square of the counter, decaying with
   * InvalidMessageDeliveriesDecay.
   * The weight of the parameter MUST be negative (or zero to disable).
   */
  invalidMessageDeliveriesWeight: number
  invalidMessageDeliveriesDecay: number
}

export const defaultPeerScoreParams: PeerScoreParams = {
  topics: {},
  topicScoreCap: 10.0,
  appSpecificScore: () => 0.0,
  appSpecificWeight: 10.0,
  IPColocationFactorWeight: -5.0,
  IPColocationFactorThreshold: 10.0,
  IPColocationFactorWhitelist: new Set(),
  behaviourPenaltyWeight: -10.0,
  behaviourPenaltyThreshold: 0.0,
  behaviourPenaltyDecay: 0.2,
  decayInterval: 1000.0,
  decayToZero: 0.1,
  retainScore: 3600 * 1000
}

export const defaultTopicScoreParams: TopicScoreParams = {
  topicWeight: 0.5,
  timeInMeshWeight: 1,
  timeInMeshQuantum: 1,
  timeInMeshCap: 3600,

  firstMessageDeliveriesWeight: 1,
  firstMessageDeliveriesDecay: 0.5,
  firstMessageDeliveriesCap: 2000,

  meshMessageDeliveriesWeight: -1,
  meshMessageDeliveriesDecay: 0.5,
  meshMessageDeliveriesCap: 100,
  meshMessageDeliveriesThreshold: 20,
  meshMessageDeliveriesWindow: 10,
  meshMessageDeliveriesActivation: 5000,

  meshFailurePenaltyWeight: -1,
  meshFailurePenaltyDecay: 0.5,

  invalidMessageDeliveriesWeight: -1,
  invalidMessageDeliveriesDecay: 0.3
}

export function createPeerScoreParams (p: Partial<PeerScoreParams> = {}): PeerScoreParams {
  return {
    ...defaultPeerScoreParams,
    ...p,
    topics: (p.topics != null)
      ? Object.entries(p.topics).reduce<Record<string, TopicScoreParams>>((topics, [topic, topicScoreParams]) => {
        topics[topic] = createTopicScoreParams(topicScoreParams)
        return topics
      }, {})
      : {}
  }
}

export function createTopicScoreParams (p: Partial<TopicScoreParams> = {}): TopicScoreParams {
  return {
    ...defaultTopicScoreParams,
    ...p
  }
}

// peer score parameter validation
export function validatePeerScoreParams (p: PeerScoreParams): void {
  for (const [topic, params] of Object.entries(p.topics)) {
    try {
      validateTopicScoreParams(params)
    } catch (e) {
      throw new InvalidPeerScoreParamsError(`invalid score parameters for topic ${topic}: ${(e as Error).message}`)
    }
  }

  // check that the topic score is 0 or something positive
  if (p.topicScoreCap < 0) {
    throw new InvalidPeerScoreParamsError('invalid topic score cap; must be positive (or 0 for no cap)')
  }

  // check that we have an app specific score; the weight can be anything (but expected positive)
  if (p.appSpecificScore === null || p.appSpecificScore === undefined) {
    throw new InvalidPeerScoreParamsError('missing application specific score function')
  }

  // check the IP colocation factor
  if (p.IPColocationFactorWeight > 0) {
    throw new InvalidPeerScoreParamsError('invalid IPColocationFactorWeight; must be negative (or 0 to disable)')
  }
  if (p.IPColocationFactorWeight !== 0 && p.IPColocationFactorThreshold < 1) {
    throw new InvalidPeerScoreParamsError('invalid IPColocationFactorThreshold; must be at least 1')
  }

  // check the behaviour penalty
  if (p.behaviourPenaltyWeight > 0) {
    throw new InvalidPeerScoreParamsError('invalid BehaviourPenaltyWeight; must be negative (or 0 to disable)')
  }
  if (p.behaviourPenaltyWeight !== 0 && (p.behaviourPenaltyDecay <= 0 || p.behaviourPenaltyDecay >= 1)) {
    throw new InvalidPeerScoreParamsError('invalid BehaviourPenaltyDecay; must be between 0 and 1')
  }

  // check the decay parameters
  if (p.decayInterval < 1000) {
    throw new InvalidPeerScoreParamsError('invalid DecayInterval; must be at least 1s')
  }
  if (p.decayToZero <= 0 || p.decayToZero >= 1) {
    throw new InvalidPeerScoreParamsError('invalid DecayToZero; must be between 0 and 1')
  }

  // no need to check the score retention; a value of 0 means that we don't retain scores
}

// eslint-disable-next-line complexity
export function validateTopicScoreParams (p: TopicScoreParams): void {
  // make sure we have a sane topic weight
  if (p.topicWeight < 0) {
    throw new InvalidPeerScoreParamsError('invalid topic weight; must be >= 0')
  }

  // check P1
  if (p.timeInMeshQuantum === 0) {
    throw new InvalidPeerScoreParamsError('invalid TimeInMeshQuantum; must be non zero')
  }
  if (p.timeInMeshWeight < 0) {
    throw new InvalidPeerScoreParamsError('invalid TimeInMeshWeight; must be positive (or 0 to disable)')
  }
  if (p.timeInMeshWeight !== 0 && p.timeInMeshQuantum <= 0) {
    throw new InvalidPeerScoreParamsError('invalid TimeInMeshQuantum; must be positive')
  }
  if (p.timeInMeshWeight !== 0 && p.timeInMeshCap <= 0) {
    throw new InvalidPeerScoreParamsError('invalid TimeInMeshCap; must be positive')
  }

  // check P2
  if (p.firstMessageDeliveriesWeight < 0) {
    throw new InvalidPeerScoreParamsError('invallid FirstMessageDeliveriesWeight; must be positive (or 0 to disable)')
  }
  if (
    p.firstMessageDeliveriesWeight !== 0 &&
    (p.firstMessageDeliveriesDecay <= 0 || p.firstMessageDeliveriesDecay >= 1)
  ) {
    throw new InvalidPeerScoreParamsError('invalid FirstMessageDeliveriesDecay; must be between 0 and 1')
  }
  if (p.firstMessageDeliveriesWeight !== 0 && p.firstMessageDeliveriesCap <= 0) {
    throw new InvalidPeerScoreParamsError('invalid FirstMessageDeliveriesCap; must be positive')
  }

  // check P3
  if (p.meshMessageDeliveriesWeight > 0) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesWeight; must be negative (or 0 to disable)')
  }
  if (p.meshMessageDeliveriesWeight !== 0 && (p.meshMessageDeliveriesDecay <= 0 || p.meshMessageDeliveriesDecay >= 1)) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesDecay; must be between 0 and 1')
  }
  if (p.meshMessageDeliveriesWeight !== 0 && p.meshMessageDeliveriesCap <= 0) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesCap; must be positive')
  }
  if (p.meshMessageDeliveriesWeight !== 0 && p.meshMessageDeliveriesThreshold <= 0) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesThreshold; must be positive')
  }
  if (p.meshMessageDeliveriesWindow < 0) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesWindow; must be non-negative')
  }
  if (p.meshMessageDeliveriesWeight !== 0 && p.meshMessageDeliveriesActivation < 1000) {
    throw new InvalidPeerScoreParamsError('invalid MeshMessageDeliveriesActivation; must be at least 1s')
  }

  // check P3b
  if (p.meshFailurePenaltyWeight > 0) {
    throw new InvalidPeerScoreParamsError('invalid MeshFailurePenaltyWeight; must be negative (or 0 to disable)')
  }
  if (p.meshFailurePenaltyWeight !== 0 && (p.meshFailurePenaltyDecay <= 0 || p.meshFailurePenaltyDecay >= 1)) {
    throw new InvalidPeerScoreParamsError('invalid MeshFailurePenaltyDecay; must be between 0 and 1')
  }

  // check P4
  if (p.invalidMessageDeliveriesWeight > 0) {
    throw new InvalidPeerScoreParamsError('invalid InvalidMessageDeliveriesWeight; must be negative (or 0 to disable)')
  }
  if (p.invalidMessageDeliveriesDecay <= 0 || p.invalidMessageDeliveriesDecay >= 1) {
    throw new InvalidPeerScoreParamsError('invalid InvalidMessageDeliveriesDecay; must be between 0 and 1')
  }
}

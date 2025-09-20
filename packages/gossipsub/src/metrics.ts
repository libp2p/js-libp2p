import { TopicValidatorResult } from './index.ts'
import {
  MessageStatus,

  RejectReason

} from './types.js'
import type { RPC } from './message/rpc.js'
import type { PeerScoreThresholds } from './score/peer-score-thresholds.js'
import type { PeerIdStr, RejectReasonObj, TopicStr, ValidateError } from './types.js'

/** Topic label as provided in `topicStrToLabel` */
export type TopicLabel = string
export type TopicStrToLabel = Map<TopicStr, TopicLabel>

export enum MessageSource {
  forward = 'forward',
  publish = 'publish'
}

type NoLabels = Record<string, never>
type LabelsGeneric = Record<string, string | number>
type LabelKeys<Labels extends LabelsGeneric> = Extract<keyof Labels, string>
interface CollectFn<Labels extends LabelsGeneric> { (metric: Gauge<Labels>): void }

export interface Gauge<Labels extends LabelsGeneric = NoLabels> {
  inc: NoLabels extends Labels ? (value?: number) => void : (labels: Labels, value?: number) => void
  set: NoLabels extends Labels ? (value: number) => void : (labels: Labels, value: number) => void

  addCollect(collectFn: CollectFn<Labels>): void
}

export interface Histogram<Labels extends LabelsGeneric = NoLabels> {
  startTimer(): () => void

  observe: NoLabels extends Labels ? (value: number) => void : (labels: Labels, value: number) => void

  reset(): void
}

export interface AvgMinMax<Labels extends LabelsGeneric = NoLabels> {
  set: NoLabels extends Labels ? (values: number[]) => void : (labels: Labels, values: number[]) => void
}

export type GaugeConfig<Labels extends LabelsGeneric> = {
  name: string
  help: string
} & (NoLabels extends Labels ? { labelNames?: never } : { labelNames: [LabelKeys<Labels>, ...Array<LabelKeys<Labels>>] })

export type HistogramConfig<Labels extends LabelsGeneric> = GaugeConfig<Labels> & {
  buckets?: number[]
}

export type AvgMinMaxConfig<Labels extends LabelsGeneric> = GaugeConfig<Labels>

export interface MetricsRegister {
  gauge<Labels extends LabelsGeneric = NoLabels>(config: GaugeConfig<Labels>): Gauge<Labels>
  histogram<Labels extends LabelsGeneric = NoLabels>(config: HistogramConfig<Labels>): Histogram<Labels>
  avgMinMax<Labels extends LabelsGeneric = NoLabels>(config: AvgMinMaxConfig<Labels>): AvgMinMax<Labels>
}

export enum InclusionReason {
  /** Peer was a fanaout peer. */
  Fanout = 'fanout',
  /** Included from random selection. */
  Random = 'random',
  /** Peer subscribed. */
  Subscribed = 'subscribed',
  /** On heartbeat, peer was included to fill the outbound quota. */
  Outbound = 'outbound',
  /** On heartbeat, not enough peers in mesh */
  NotEnough = 'not_enough',
  /** On heartbeat opportunistic grafting due to low mesh score */
  Opportunistic = 'opportunistic'
}

/// Reasons why a peer was removed from the mesh.
export enum ChurnReason {
  /// Peer disconnected.
  Dc = 'disconnected',
  /// Peer had a bad score.
  BadScore = 'bad_score',
  /// Peer sent a PRUNE.
  Prune = 'prune',
  /// Too many peers.
  Excess = 'excess'
}

/// Kinds of reasons a peer's score has been penalized
export enum ScorePenalty {
  /// A peer grafted before waiting the back-off time.
  GraftBackoff = 'graft_backoff',
  /// A Peer did not respond to an IWANT request in time.
  BrokenPromise = 'broken_promise',
  /// A Peer did not send enough messages as expected.
  MessageDeficit = 'message_deficit',
  /// Too many peers under one IP address.
  IPColocation = 'IP_colocation'
}

export enum IHaveIgnoreReason {
  LowScore = 'low_score',
  MaxIhave = 'max_ihave',
  MaxIasked = 'max_iasked'
}

export enum ScoreThreshold {
  graylist = 'graylist',
  publish = 'publish',
  gossip = 'gossip',
  mesh = 'mesh'
}

export type PeersByScoreThreshold = Record<ScoreThreshold, number>

export interface ToSendGroupCount {
  direct: number
  floodsub: number
  mesh: number
  fanout: number
}

export interface ToAddGroupCount {
  fanout: number
  random: number
}

export type PromiseDeliveredStats =
  | { expired: false, requestedCount: number, maxDeliverMs: number }
  | { expired: true, maxDeliverMs: number }

export interface TopicScoreWeights<T> { p1w: T, p2w: T, p3w: T, p3bw: T, p4w: T }
export interface ScoreWeights<T> {
  byTopic: Map<TopicLabel, TopicScoreWeights<T>>
  p5w: T
  p6w: T
  p7w: T
  score: T
}

export type Metrics = ReturnType<typeof getMetrics>

/**
 * A collection of metrics used throughout the Gossipsub behaviour.
 * NOTE: except for special reasons, do not add more than 1 label for frequent metrics,
 * there's a performance penalty as of June 2023.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getMetrics (
  register: MetricsRegister,
  topicStrToLabel: TopicStrToLabel,
  opts: { gossipPromiseExpireSec: number, behaviourPenaltyThreshold: number, maxMeshMessageDeliveriesWindowSec: number }
) {
  // Using function style instead of class to prevent having to re-declare all MetricsPrometheus types.

  return {
    /* Metrics for static config */
    protocolsEnabled: register.gauge<{ protocol: string }>({
      name: 'gossipsub_protocol',
      help: 'Status of enabled protocols',
      labelNames: ['protocol']
    }),

    /* Metrics per known topic */
    /**
     * Status of our subscription to this topic. This metric allows analyzing other topic metrics
     * filtered by our current subscription status.
     * = rust-libp2p `topic_subscription_status`
     */
    topicSubscriptionStatus: register.gauge<{ topicStr: TopicStr }>({
      name: 'gossipsub_topic_subscription_status',
      help: 'Status of our subscription to this topic',
      labelNames: ['topicStr']
    }),
    /**
     * Number of peers subscribed to each topic. This allows us to analyze a topic's behaviour
     * regardless of our subscription status.
     */
    topicPeersCount: register.gauge<{ topicStr: TopicStr }>({
      name: 'gossipsub_topic_peer_count',
      help: 'Number of peers subscribed to each topic',
      labelNames: ['topicStr']
    }),

    /* Metrics regarding mesh state */
    /**
     * Number of peers in our mesh. This metric should be updated with the count of peers for a
     * topic in the mesh regardless of inclusion and churn events.
     * = rust-libp2p `mesh_peer_counts`
     */
    meshPeerCounts: register.gauge<{ topicStr: TopicStr }>({
      name: 'gossipsub_mesh_peer_count',
      help: 'Number of peers in our mesh',
      labelNames: ['topicStr']
    }),
    /**
     * Number of times we include peers in a topic mesh for different reasons.
     * = rust-libp2p `mesh_peer_inclusion_events`
     */
    meshPeerInclusionEventsFanout: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_fanout_total',
      help: 'Number of times we include peers in a topic mesh for fanout reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsRandom: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_random_total',
      help: 'Number of times we include peers in a topic mesh for random reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsSubscribed: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_subscribed_total',
      help: 'Number of times we include peers in a topic mesh for subscribed reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsOutbound: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_outbound_total',
      help: 'Number of times we include peers in a topic mesh for outbound reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsNotEnough: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_not_enough_total',
      help: 'Number of times we include peers in a topic mesh for not_enough reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsOpportunistic: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_opportunistic_total',
      help: 'Number of times we include peers in a topic mesh for opportunistic reasons',
      labelNames: ['topic']
    }),
    meshPeerInclusionEventsUnknown: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peer_inclusion_events_unknown_total',
      help: 'Number of times we include peers in a topic mesh for unknown reasons',
      labelNames: ['topic']
    }),
    /**
     * Number of times we remove peers in a topic mesh for different reasons.
     * = rust-libp2p `mesh_peer_churn_events`
     */
    meshPeerChurnEventsDisconnected: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_peer_churn_events_disconnected_total',
      help: 'Number of times we remove peers in a topic mesh for disconnected reasons',
      labelNames: ['topic']
    }),
    meshPeerChurnEventsBadScore: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_peer_churn_events_bad_score_total',
      help: 'Number of times we remove peers in a topic mesh for bad_score reasons',
      labelNames: ['topic']
    }),
    meshPeerChurnEventsPrune: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_peer_churn_events_prune_total',
      help: 'Number of times we remove peers in a topic mesh for prune reasons',
      labelNames: ['topic']
    }),
    meshPeerChurnEventsExcess: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_peer_churn_events_excess_total',
      help: 'Number of times we remove peers in a topic mesh for excess reasons',
      labelNames: ['topic']
    }),
    meshPeerChurnEventsUnknown: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_peer_churn_events_unknown_total',
      help: 'Number of times we remove peers in a topic mesh for unknown reasons',
      labelNames: ['topic']
    }),

    /* General Metrics */
    /**
     * Gossipsub supports floodsub, gossipsub v1.0, v1.1, and v1.2. Peers are classified based
     * on which protocol they support. This metric keeps track of the number of peers that are
     * connected of each type.
     */
    peersPerProtocol: register.gauge<{ protocol: string }>({
      name: 'gossipsub_peers_per_protocol_count',
      help: 'Peers connected for each topic',
      labelNames: ['protocol']
    }),
    /** The time it takes to complete one iteration of the heartbeat. */
    heartbeatDuration: register.histogram({
      name: 'gossipsub_heartbeat_duration_seconds',
      help: 'The time it takes to complete one iteration of the heartbeat',
      // Should take <10ms, over 1s it's a huge issue that needs debugging, since a heartbeat will be cancelled
      buckets: [0.01, 0.1, 1]
    }),
    /** Heartbeat run took longer than heartbeat interval so next is skipped */
    heartbeatSkipped: register.gauge({
      name: 'gossipsub_heartbeat_skipped',
      help: 'Heartbeat run took longer than heartbeat interval so next is skipped'
    }),

    /**
     * Message validation results for each topic.
     * Invalid == Reject?
     * = rust-libp2p `invalid_messages`, `accepted_messages`, `ignored_messages`, `rejected_messages`
     */
    acceptedMessagesTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_accepted_messages_total',
      help: 'Total accepted messages for each topic',
      labelNames: ['topic']
    }),
    ignoredMessagesTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_ignored_messages_total',
      help: 'Total ignored messages for each topic',
      labelNames: ['topic']
    }),
    rejectedMessagesTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_rejected_messages_total',
      help: 'Total rejected messages for each topic',
      labelNames: ['topic']
    }),
    unknownValidationResultsTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_unknown_validation_results_total',
      help: 'Total unknown validation results for each topic',
      labelNames: ['topic']
    }),
    /**
     * When the user validates a message, it tries to re propagate it to its mesh peers. If the
     * message expires from the memcache before it can be validated, we count this a cache miss
     * and it is an indicator that the memcache size should be increased.
     * = rust-libp2p `mcache_misses`
     */
    asyncValidationMcacheHit: register.gauge<{ hit: 'hit' | 'miss' }>({
      name: 'gossipsub_async_validation_mcache_hit_total',
      help: 'Async validation result reported by the user layer',
      labelNames: ['hit']
    }),

    asyncValidationDelayFromFirstSeenSec: register.histogram({
      name: 'gossipsub_async_validation_delay_from_first_seen',
      help: 'Async validation report delay from first seen in second',
      buckets: [0.01, 0.03, 0.1, 0.3, 1, 3, 10]
    }),

    asyncValidationUnknownFirstSeen: register.gauge({
      name: 'gossipsub_async_validation_unknown_first_seen_count_total',
      help: 'Async validation report unknown first seen value for message'
    }),

    // peer stream
    peerReadStreamError: register.gauge({
      name: 'gossipsub_peer_read_stream_err_count_total',
      help: 'Peer read stream error'
    }),

    // RPC outgoing. Track byte length + data structure sizes
    rpcRecvBytes: register.gauge({ name: 'gossipsub_rpc_recv_bytes_total', help: 'RPC recv' }),
    rpcRecvCount: register.gauge({ name: 'gossipsub_rpc_recv_count_total', help: 'RPC recv' }),
    rpcRecvSubscription: register.gauge({ name: 'gossipsub_rpc_recv_subscription_total', help: 'RPC recv' }),
    rpcRecvMessage: register.gauge({ name: 'gossipsub_rpc_recv_message_total', help: 'RPC recv' }),
    rpcRecvControl: register.gauge({ name: 'gossipsub_rpc_recv_control_total', help: 'RPC recv' }),
    rpcRecvIHave: register.gauge({ name: 'gossipsub_rpc_recv_ihave_total', help: 'RPC recv' }),
    rpcRecvIWant: register.gauge({ name: 'gossipsub_rpc_recv_iwant_total', help: 'RPC recv' }),
    rpcRecvGraft: register.gauge({ name: 'gossipsub_rpc_recv_graft_total', help: 'RPC recv' }),
    rpcRecvPrune: register.gauge({ name: 'gossipsub_rpc_recv_prune_total', help: 'RPC recv' }),
    rpcDataError: register.gauge({ name: 'gossipsub_rpc_data_err_count_total', help: 'RPC data error' }),
    rpcRecvError: register.gauge({ name: 'gossipsub_rpc_recv_err_count_total', help: 'RPC recv error' }),

    /** Total count of RPC dropped because acceptFrom() == false */
    rpcRecvNotAccepted: register.gauge({
      name: 'gossipsub_rpc_rcv_not_accepted_total',
      help: 'Total count of RPC dropped because acceptFrom() == false'
    }),

    // RPC incoming. Track byte length + data structure sizes
    rpcSentBytes: register.gauge({ name: 'gossipsub_rpc_sent_bytes_total', help: 'RPC sent' }),
    rpcSentCount: register.gauge({ name: 'gossipsub_rpc_sent_count_total', help: 'RPC sent' }),
    rpcSentSubscription: register.gauge({ name: 'gossipsub_rpc_sent_subscription_total', help: 'RPC sent' }),
    rpcSentMessage: register.gauge({ name: 'gossipsub_rpc_sent_message_total', help: 'RPC sent' }),
    rpcSentControl: register.gauge({ name: 'gossipsub_rpc_sent_control_total', help: 'RPC sent' }),
    rpcSentIHave: register.gauge({ name: 'gossipsub_rpc_sent_ihave_total', help: 'RPC sent' }),
    rpcSentIWant: register.gauge({ name: 'gossipsub_rpc_sent_iwant_total', help: 'RPC sent' }),
    rpcSentGraft: register.gauge({ name: 'gossipsub_rpc_sent_graft_total', help: 'RPC sent' }),
    rpcSentPrune: register.gauge({ name: 'gossipsub_rpc_sent_prune_total', help: 'RPC sent' }),
    rpcSentIDontWant: register.gauge({ name: 'gossipsub_rpc_sent_idontwant_total', help: 'RPC sent' }),

    // publish message. Track peers sent to and bytes
    /** Total count of msg published by topic */
    msgPublishCount: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_publish_count_total',
      help: 'Total count of msg published by topic',
      labelNames: ['topic']
    }),
    /** Total count of peers that we publish a msg to */
    msgPublishPeersByTopic: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_publish_peers_total',
      help: 'Total count of peers that we publish a msg to',
      labelNames: ['topic']
    }),
    /** Total count of peers (by group) that we publish a msg to */
    directPeersPublishedTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_direct_peers_published_total',
      help: 'Total direct peers that we publish a msg to',
      labelNames: ['topic']
    }),
    floodsubPeersPublishedTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_floodsub_peers_published_total',
      help: 'Total floodsub peers that we publish a msg to',
      labelNames: ['topic']
    }),
    meshPeersPublishedTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_mesh_peers_published_total',
      help: 'Total mesh peers that we publish a msg to',
      labelNames: ['topic']
    }),
    fanoutPeersPublishedTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_fanout_peers_published_total',
      help: 'Total fanout peers that we publish a msg to',
      labelNames: ['topic']
    }),
    /** Total count of msg publish data.length bytes */
    msgPublishBytes: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_publish_bytes_total',
      help: 'Total count of msg publish data.length bytes',
      labelNames: ['topic']
    }),
    /** Total time in seconds to publish a message */
    msgPublishTime: register.histogram<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_publish_seconds',
      help: 'Total time in seconds to publish a message',
      buckets: [0.001, 0.002, 0.005, 0.01, 0.1, 0.5, 1],
      labelNames: ['topic']
    }),

    /** Total count of msg forwarded by topic */
    msgForwardCount: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_forward_count_total',
      help: 'Total count of msg forwarded by topic',
      labelNames: ['topic']
    }),
    /** Total count of peers that we forward a msg to */
    msgForwardPeers: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_forward_peers_total',
      help: 'Total count of peers that we forward a msg to',
      labelNames: ['topic']
    }),

    /** Total count of recv msgs before any validation */
    msgReceivedPreValidation: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_received_prevalidation_total',
      help: 'Total count of recv msgs before any validation',
      labelNames: ['topic']
    }),
    /** Total count of recv msgs error */
    msgReceivedError: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_received_error_total',
      help: 'Total count of recv msgs error',
      labelNames: ['topic']
    }),
    /** Tracks distribution of recv msgs by duplicate, invalid, valid */
    prevalidationInvalidTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_pre_validation_invalid_total',
      help: 'Total count of invalid messages received',
      labelNames: ['topic']
    }),
    prevalidationValidTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_pre_validation_valid_total',
      help: 'Total count of valid messages received',
      labelNames: ['topic']
    }),
    prevalidationDuplicateTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_pre_validation_duplicate_total',
      help: 'Total count of duplicate messages received',
      labelNames: ['topic']
    }),
    prevalidationUnknownTotal: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_pre_validation_unknown_status_total',
      help: 'Total count of unknown_status messages received',
      labelNames: ['topic']
    }),
    /** Tracks specific reason of invalid */
    msgReceivedInvalid: register.gauge<{ error: RejectReason | ValidateError }>({
      name: 'gossipsub_msg_received_invalid_total',
      help: 'Tracks specific reason of invalid',
      labelNames: ['error']
    }),
    msgReceivedInvalidByTopic: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_msg_received_invalid_by_topic_total',
      help: 'Tracks specific invalid message by topic',
      labelNames: ['topic']
    }),
    /** Track duplicate message delivery time */
    duplicateMsgDeliveryDelay: register.histogram<{ topic: TopicLabel }>({
      name: 'gossisub_duplicate_msg_delivery_delay_seconds',
      help: 'Time since the 1st duplicated message validated',
      labelNames: ['topic'],
      buckets: [
        0.25 * opts.maxMeshMessageDeliveriesWindowSec,
        0.5 * opts.maxMeshMessageDeliveriesWindowSec,
        Number(opts.maxMeshMessageDeliveriesWindowSec),
        2 * opts.maxMeshMessageDeliveriesWindowSec,
        4 * opts.maxMeshMessageDeliveriesWindowSec
      ]
    }),
    /** Total count of late msg delivery total by topic */
    duplicateMsgLateDelivery: register.gauge<{ topic: TopicLabel }>({
      name: 'gossisub_duplicate_msg_late_delivery_total',
      help: 'Total count of late duplicate message delivery by topic, which triggers P3 penalty',
      labelNames: ['topic']
    }),

    duplicateMsgIgnored: register.gauge<{ topic: TopicLabel }>({
      name: 'gossisub_ignored_published_duplicate_msgs_total',
      help: 'Total count of published duplicate message ignored by topic',
      labelNames: ['topic']
    }),

    /* Metrics related to scoring */
    /** Total times score() is called */
    scoreFnCalls: register.gauge({
      name: 'gossipsub_score_fn_calls_total',
      help: 'Total times score() is called'
    }),
    /** Total times score() call actually computed computeScore(), no cache */
    scoreFnRuns: register.gauge({
      name: 'gossipsub_score_fn_runs_total',
      help: 'Total times score() call actually computed computeScore(), no cache'
    }),
    scoreCachedDelta: register.histogram({
      name: 'gossipsub_score_cache_delta',
      help: 'Delta of score between cached values that expired',
      buckets: [10, 100, 1000]
    }),
    /** Current count of peers by score threshold */
    peersByScoreThreshold: register.gauge<{ threshold: ScoreThreshold }>({
      name: 'gossipsub_peers_by_score_threshold_count',
      help: 'Current count of peers by score threshold',
      labelNames: ['threshold']
    }),
    score: register.avgMinMax({
      name: 'gossipsub_score',
      help: 'Avg min max of gossip scores'
    }),
    /**
     * Separate score weights
     * Need to use 2-label metrics in this case to debug the score weights
     */
    scoreWeights: register.avgMinMax<{ topic?: TopicLabel, p: string }>({
      name: 'gossipsub_score_weights',
      help: 'Separate score weights',
      labelNames: ['topic', 'p']
    }),
    /** Histogram of the scores for each mesh topic. */
    // TODO: Not implemented
    scorePerMesh: register.avgMinMax<{ topic: TopicLabel }>({
      name: 'gossipsub_score_per_mesh',
      help: 'Histogram of the scores for each mesh topic',
      labelNames: ['topic']
    }),
    /** A counter of the kind of penalties being applied to peers. */
    // TODO: Not fully implemented
    scoringPenalties: register.gauge<{ penalty: ScorePenalty }>({
      name: 'gossipsub_scoring_penalties_total',
      help: 'A counter of the kind of penalties being applied to peers',
      labelNames: ['penalty']
    }),
    behaviourPenalty: register.histogram({
      name: 'gossipsub_peer_stat_behaviour_penalty',
      help: 'Current peer stat behaviour_penalty at each scrape',
      buckets: [
        0.25 * opts.behaviourPenaltyThreshold,
        0.5 * opts.behaviourPenaltyThreshold,
        Number(opts.behaviourPenaltyThreshold),
        2 * opts.behaviourPenaltyThreshold,
        4 * opts.behaviourPenaltyThreshold
      ]
    }),

    // TODO:
    // - iasked per peer (on heartbeat)
    // - when promise is resolved, track messages from promises

    /** Total received IHAVE messages that we ignore for some reason */
    ihaveRcvIgnored: register.gauge<{ reason: IHaveIgnoreReason }>({
      name: 'gossipsub_ihave_rcv_ignored_total',
      help: 'Total received IHAVE messages that we ignore for some reason',
      labelNames: ['reason']
    }),
    /** Total received IHAVE messages by topic */
    ihaveRcvMsgids: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_ihave_rcv_msgids_total',
      help: 'Total received IHAVE messages by topic',
      labelNames: ['topic']
    }),
    /**
     * Total messages per topic we don't have. Not actual requests.
     * The number of times we have decided that an IWANT control message is required for this
     * topic. A very high metric might indicate an underperforming network.
     * = rust-libp2p `topic_iwant_msgs`
     */
    ihaveRcvNotSeenMsgids: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_ihave_rcv_not_seen_msgids_total',
      help: 'Total messages per topic we do not have, not actual requests',
      labelNames: ['topic']
    }),

    /** Total received IWANT messages by topic */
    iwantRcvMsgids: register.gauge<{ topic: TopicLabel }>({
      name: 'gossipsub_iwant_rcv_msgids_total',
      help: 'Total received IWANT messages by topic',
      labelNames: ['topic']
    }),
    /** Total requested messageIDs that we don't have */
    iwantRcvDonthaveMsgids: register.gauge({
      name: 'gossipsub_iwant_rcv_dont_have_msgids_total',
      help: 'Total requested messageIDs that we do not have'
    }),
    /** Total received IDONTWANT messages */
    idontwantRcvMsgids: register.gauge({
      name: 'gossipsub_idontwant_rcv_msgids_total',
      help: 'Total received IDONTWANT messages'
    }),
    /** Total received IDONTWANT messageIDs that we don't have */
    idontwantRcvDonthaveMsgids: register.gauge({
      name: 'gossipsub_idontwant_rcv_dont_have_msgids_total',
      help: 'Total received IDONTWANT messageIDs that we do not have in mcache'
    }),
    iwantPromiseStarted: register.gauge({
      name: 'gossipsub_iwant_promise_sent_total',
      help: 'Total count of started IWANT promises'
    }),
    /** Total count of resolved IWANT promises */
    iwantPromiseResolved: register.gauge({
      name: 'gossipsub_iwant_promise_resolved_total',
      help: 'Total count of resolved IWANT promises'
    }),
    /** Total count of resolved IWANT promises from duplicate messages */
    iwantPromiseResolvedFromDuplicate: register.gauge({
      name: 'gossipsub_iwant_promise_resolved_from_duplicate_total',
      help: 'Total count of resolved IWANT promises from duplicate messages'
    }),
    /** Total count of peers we have asked IWANT promises that are resolved */
    iwantPromiseResolvedPeers: register.gauge({
      name: 'gossipsub_iwant_promise_resolved_peers',
      help: 'Total count of peers we have asked IWANT promises that are resolved'
    }),
    iwantPromiseBroken: register.gauge({
      name: 'gossipsub_iwant_promise_broken',
      help: 'Total count of broken IWANT promises'
    }),
    iwantMessagePruned: register.gauge({
      name: 'gossipsub_iwant_message_pruned',
      help: 'Total count of pruned IWANT messages'
    }),
    /** Histogram of delivery time of resolved IWANT promises */
    iwantPromiseDeliveryTime: register.histogram({
      name: 'gossipsub_iwant_promise_delivery_seconds',
      help: 'Histogram of delivery time of resolved IWANT promises',
      buckets: [
        0.5 * opts.gossipPromiseExpireSec,
        Number(opts.gossipPromiseExpireSec),
        2 * opts.gossipPromiseExpireSec,
        4 * opts.gossipPromiseExpireSec
      ]
    }),
    iwantPromiseUntracked: register.gauge({
      name: 'gossip_iwant_promise_untracked',
      help: 'Total count of untracked IWANT promise'
    }),
    /** Backoff time */
    connectedPeersBackoffSec: register.histogram({
      name: 'gossipsub_connected_peers_backoff_seconds',
      help: 'Backoff time in seconds',
      // Using 1 seconds as minimum as that's close to the heartbeat duration, no need for more resolution.
      // As per spec, backoff times are 10 seconds for UnsubscribeBackoff and 60 seconds for PruneBackoff.
      // Higher values of 60 seconds should not occur, but we add 120 seconds just in case
      // https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/gossipsub-v1.1.md#overview-of-new-parameters
      buckets: [1, 2, 4, 10, 20, 60, 120]
    }),

    /* Data structure sizes */
    /** Unbounded cache sizes */
    cacheSize: register.gauge<{ cache: string }>({
      name: 'gossipsub_cache_size',
      help: 'Unbounded cache sizes',
      labelNames: ['cache']
    }),
    /** Current mcache msg count */
    mcacheSize: register.gauge({
      name: 'gossipsub_mcache_size',
      help: 'Current mcache msg count'
    }),
    mcacheNotValidatedCount: register.gauge({
      name: 'gossipsub_mcache_not_validated_count',
      help: 'Current mcache msg count not validated'
    }),

    fastMsgIdCacheCollision: register.gauge({
      name: 'gossipsub_fastmsgid_cache_collision_total',
      help: 'Total count of key collisions on fastmsgid cache put'
    }),

    newConnectionCount: register.gauge<{ status: string }>({
      name: 'gossipsub_new_connection_total',
      help: 'Total new connection by status',
      labelNames: ['status']
    }),

    topicStrToLabel,

    toTopic (topicStr: TopicStr): TopicLabel {
      return this.topicStrToLabel.get(topicStr) ?? topicStr
    },

    /** We joined a topic */
    onJoin (topicStr: TopicStr): void {
      this.topicSubscriptionStatus.set({ topicStr }, 1)
      this.meshPeerCounts.set({ topicStr }, 0) // Reset count
    },

    /** We left a topic */
    onLeave (topicStr: TopicStr): void {
      this.topicSubscriptionStatus.set({ topicStr }, 0)
      this.meshPeerCounts.set({ topicStr }, 0) // Reset count
    },

    /** Register the inclusion of peers in our mesh due to some reason. */
    onAddToMesh (topicStr: TopicStr, reason: InclusionReason, count: number): void {
      const topic = this.toTopic(topicStr)
      switch (reason) {
        case InclusionReason.Fanout:
          this.meshPeerInclusionEventsFanout.inc({ topic }, count)
          break
        case InclusionReason.Random:
          this.meshPeerInclusionEventsRandom.inc({ topic }, count)
          break
        case InclusionReason.Subscribed:
          this.meshPeerInclusionEventsSubscribed.inc({ topic }, count)
          break
        case InclusionReason.Outbound:
          this.meshPeerInclusionEventsOutbound.inc({ topic }, count)
          break
        case InclusionReason.NotEnough:
          this.meshPeerInclusionEventsNotEnough.inc({ topic }, count)
          break
        case InclusionReason.Opportunistic:
          this.meshPeerInclusionEventsOpportunistic.inc({ topic }, count)
          break
        default:
          this.meshPeerInclusionEventsUnknown.inc({ topic }, count)
          break
      }
    },

    /** Register the removal of peers in our mesh due to some reason */
    // - remove_peer_from_mesh()
    // - heartbeat() Churn::BadScore
    // - heartbeat() Churn::Excess
    // - on_disconnect() Churn::Ds
    onRemoveFromMesh (topicStr: TopicStr, reason: ChurnReason, count: number): void {
      const topic = this.toTopic(topicStr)
      switch (reason) {
        case ChurnReason.Dc:
          this.meshPeerChurnEventsDisconnected.inc({ topic }, count)
          break
        case ChurnReason.BadScore:
          this.meshPeerChurnEventsBadScore.inc({ topic }, count)
          break
        case ChurnReason.Prune:
          this.meshPeerChurnEventsPrune.inc({ topic }, count)
          break
        case ChurnReason.Excess:
          this.meshPeerChurnEventsExcess.inc({ topic }, count)
          break
        default:
          this.meshPeerChurnEventsUnknown.inc({ topic }, count)
          break
      }
    },

    /**
     * Update validation result to metrics
     *
     * @param messageRecord - null means the message's mcache record was not known at the time of acceptance report
     */
    onReportValidation (
      messageRecord: { message: { topic: TopicStr } } | null,
      acceptance: TopicValidatorResult,
      firstSeenTimestampMs: number | null
    ): void {
      this.asyncValidationMcacheHit.inc({ hit: messageRecord != null ? 'hit' : 'miss' })

      if (messageRecord != null) {
        const topic = this.toTopic(messageRecord.message.topic)
        switch (acceptance) {
          case TopicValidatorResult.Accept:
            this.acceptedMessagesTotal.inc({ topic })
            break
          case TopicValidatorResult.Ignore:
            this.ignoredMessagesTotal.inc({ topic })
            break
          case TopicValidatorResult.Reject:
            this.rejectedMessagesTotal.inc({ topic })
            break
          default:
            this.unknownValidationResultsTotal.inc({ topic })
            break
        }
      }

      if (firstSeenTimestampMs != null) {
        this.asyncValidationDelayFromFirstSeenSec.observe((Date.now() - firstSeenTimestampMs) / 1000)
      } else {
        this.asyncValidationUnknownFirstSeen.inc()
      }
    },

    /**
     * - in handle_graft() Penalty::GraftBackoff
     * - in apply_iwant_penalties() Penalty::BrokenPromise
     * - in metric_score() P3 Penalty::MessageDeficit
     * - in metric_score() P6 Penalty::IPColocation
     */
    onScorePenalty (penalty: ScorePenalty): void {
      // Can this be labeled by topic too?
      this.scoringPenalties.inc({ penalty }, 1)
    },

    onIhaveRcv (topicStr: TopicStr, ihave: number, idonthave: number): void {
      const topic = this.toTopic(topicStr)
      this.ihaveRcvMsgids.inc({ topic }, ihave)
      this.ihaveRcvNotSeenMsgids.inc({ topic }, idonthave)
    },

    onIwantRcv (iwantByTopic: Map<TopicStr, number>, iwantDonthave: number): void {
      for (const [topicStr, iwant] of iwantByTopic) {
        const topic = this.toTopic(topicStr)
        this.iwantRcvMsgids.inc({ topic }, iwant)
      }

      this.iwantRcvDonthaveMsgids.inc(iwantDonthave)
    },

    onIdontwantRcv (idontwant: number, idontwantDonthave: number): void {
      this.idontwantRcvMsgids.inc(idontwant)
      this.idontwantRcvDonthaveMsgids.inc(idontwantDonthave)
    },

    onForwardMsg (topicStr: TopicStr, tosendCount: number): void {
      const topic = this.toTopic(topicStr)
      this.msgForwardCount.inc({ topic }, 1)
      this.msgForwardPeers.inc({ topic }, tosendCount)
    },

    onPublishMsg (
      topicStr: TopicStr,
      tosendGroupCount: ToSendGroupCount,
      tosendCount: number,
      dataLen: number,
      ms: number
    ): void {
      const topic = this.toTopic(topicStr)
      this.msgPublishCount.inc({ topic }, 1)
      this.msgPublishBytes.inc({ topic }, tosendCount * dataLen)
      this.msgPublishPeersByTopic.inc({ topic }, tosendCount)
      this.directPeersPublishedTotal.inc({ topic }, tosendGroupCount.direct)
      this.floodsubPeersPublishedTotal.inc({ topic }, tosendGroupCount.floodsub)
      this.meshPeersPublishedTotal.inc({ topic }, tosendGroupCount.mesh)
      this.fanoutPeersPublishedTotal.inc({ topic }, tosendGroupCount.fanout)
      this.msgPublishTime.observe({ topic }, ms / 1000)
    },

    onMsgRecvPreValidation (topicStr: TopicStr): void {
      const topic = this.toTopic(topicStr)
      this.msgReceivedPreValidation.inc({ topic }, 1)
    },

    onMsgRecvError (topicStr: TopicStr): void {
      const topic = this.toTopic(topicStr)
      this.msgReceivedError.inc({ topic }, 1)
    },

    onPrevalidationResult (topicStr: TopicStr, status: MessageStatus): void {
      const topic = this.toTopic(topicStr)
      switch (status) {
        case MessageStatus.duplicate:
          this.prevalidationDuplicateTotal.inc({ topic })
          break
        case MessageStatus.invalid:
          this.prevalidationInvalidTotal.inc({ topic })
          break
        case MessageStatus.valid:
          this.prevalidationValidTotal.inc({ topic })
          break
        default:
          this.prevalidationUnknownTotal.inc({ topic })
          break
      }
    },

    onMsgRecvInvalid (topicStr: TopicStr, reason: RejectReasonObj): void {
      const topic = this.toTopic(topicStr)

      const error = reason.reason === RejectReason.Error ? reason.error : reason.reason
      this.msgReceivedInvalid.inc({ error }, 1)
      this.msgReceivedInvalidByTopic.inc({ topic }, 1)
    },

    onDuplicateMsgDelivery (topicStr: TopicStr, deliveryDelayMs: number, isLateDelivery: boolean): void {
      const topic = this.toTopic(topicStr)
      this.duplicateMsgDeliveryDelay.observe({ topic }, deliveryDelayMs / 1000)
      if (isLateDelivery) {
        this.duplicateMsgLateDelivery.inc({ topic }, 1)
      }
    },

    onPublishDuplicateMsg (topicStr: TopicStr): void {
      const topic = this.toTopic(topicStr)
      this.duplicateMsgIgnored.inc({ topic }, 1)
    },

    onPeerReadStreamError (): void {
      this.peerReadStreamError.inc(1)
    },

    onRpcRecvError (): void {
      this.rpcRecvError.inc(1)
    },

    onRpcDataError (): void {
      this.rpcDataError.inc(1)
    },

    onRpcRecv (rpc: RPC, rpcBytes: number): void {
      this.rpcRecvBytes.inc(rpcBytes)
      this.rpcRecvCount.inc(1)
      if (rpc.subscriptions != null) { this.rpcRecvSubscription.inc(rpc.subscriptions.length) }
      if (rpc.messages != null) { this.rpcRecvMessage.inc(rpc.messages.length) }
      if (rpc.control != null) {
        this.rpcRecvControl.inc(1)
        if (rpc.control.ihave != null) { this.rpcRecvIHave.inc(rpc.control.ihave.length) }
        if (rpc.control.iwant != null) { this.rpcRecvIWant.inc(rpc.control.iwant.length) }
        if (rpc.control.graft != null) { this.rpcRecvGraft.inc(rpc.control.graft.length) }
        if (rpc.control.prune != null) { this.rpcRecvPrune.inc(rpc.control.prune.length) }
      }
    },

    onRpcSent (rpc: RPC, rpcBytes: number): void {
      this.rpcSentBytes.inc(rpcBytes)
      this.rpcSentCount.inc(1)
      if (rpc.subscriptions != null) { this.rpcSentSubscription.inc(rpc.subscriptions.length) }
      if (rpc.messages != null) { this.rpcSentMessage.inc(rpc.messages.length) }
      if (rpc.control != null) {
        const ihave = rpc.control.ihave?.length ?? 0
        const iwant = rpc.control.iwant?.length ?? 0
        const graft = rpc.control.graft?.length ?? 0
        const prune = rpc.control.prune?.length ?? 0
        const idontwant = rpc.control.idontwant?.length ?? 0
        if (ihave > 0) { this.rpcSentIHave.inc(ihave) }
        if (iwant > 0) { this.rpcSentIWant.inc(iwant) }
        if (graft > 0) { this.rpcSentGraft.inc(graft) }
        if (prune > 0) { this.rpcSentPrune.inc(prune) }
        if (idontwant > 0) { this.rpcSentIDontWant.inc(idontwant) }
        if (ihave > 0 || iwant > 0 || graft > 0 || prune > 0 || idontwant > 0) { this.rpcSentControl.inc(1) }
      }
    },

    registerScores (scores: number[], scoreThresholds: PeerScoreThresholds): void {
      let graylist = 0
      let publish = 0
      let gossip = 0
      let mesh = 0

      for (const score of scores) {
        if (score >= scoreThresholds.graylistThreshold) { graylist++ }
        if (score >= scoreThresholds.publishThreshold) { publish++ }
        if (score >= scoreThresholds.gossipThreshold) { gossip++ }
        if (score >= 0) { mesh++ }
      }

      this.peersByScoreThreshold.set({ threshold: ScoreThreshold.graylist }, graylist)
      this.peersByScoreThreshold.set({ threshold: ScoreThreshold.publish }, publish)
      this.peersByScoreThreshold.set({ threshold: ScoreThreshold.gossip }, gossip)
      this.peersByScoreThreshold.set({ threshold: ScoreThreshold.mesh }, mesh)

      // Register full score too
      this.score.set(scores)
    },

    registerScoreWeights (sw: ScoreWeights<number[]>): void {
      for (const [topic, wsTopic] of sw.byTopic) {
        this.scoreWeights.set({ topic, p: 'p1' }, wsTopic.p1w)
        this.scoreWeights.set({ topic, p: 'p2' }, wsTopic.p2w)
        this.scoreWeights.set({ topic, p: 'p3' }, wsTopic.p3w)
        this.scoreWeights.set({ topic, p: 'p3b' }, wsTopic.p3bw)
        this.scoreWeights.set({ topic, p: 'p4' }, wsTopic.p4w)
      }

      this.scoreWeights.set({ p: 'p5' }, sw.p5w)
      this.scoreWeights.set({ p: 'p6' }, sw.p6w)
      this.scoreWeights.set({ p: 'p7' }, sw.p7w)
    },

    registerScorePerMesh (mesh: Map<TopicStr, Set<PeerIdStr>>, scoreByPeer: Map<PeerIdStr, number>): void {
      const peersPerTopicLabel = new Map<TopicLabel, Set<PeerIdStr>>()

      mesh.forEach((peers, topicStr) => {
        // Aggregate by known topicLabel or throw to 'unknown'. This prevent too high cardinality
        const topicLabel = this.topicStrToLabel.get(topicStr) ?? 'unknown'
        let peersInMesh = peersPerTopicLabel.get(topicLabel)
        if (peersInMesh == null) {
          peersInMesh = new Set()
          peersPerTopicLabel.set(topicLabel, peersInMesh)
        }
        peers.forEach((p) => peersInMesh?.add(p))
      })

      for (const [topic, peers] of peersPerTopicLabel) {
        const meshScores: number[] = []
        peers.forEach((peer) => {
          meshScores.push(scoreByPeer.get(peer) ?? 0)
        })
        this.scorePerMesh.set({ topic }, meshScores)
      }
    }
  }
}

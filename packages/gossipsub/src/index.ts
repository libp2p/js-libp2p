import * as constants from './constants.js'
import { GossipSub as GossipSubClass } from './gossipsub.ts'
import { MessageCache } from './message-cache.js'
import type { GossipsubOptsSpec } from './config.js'
import type { DecodeRPCLimits } from './message/decodeRpc.js'
import type { MetricsRegister, TopicStrToLabel } from './metrics.js'
import type { PeerScoreParams, PeerScoreThresholds } from './score/index.js'
import type { MsgIdFn, MsgIdStr, FastMsgIdFn, AddrInfo, DataTransform, MsgIdToStrFn } from './types.js'
import type {
  PeerId, PeerStore,
  ComponentLogger,
  PrivateKey,
  PublicKey,
  TypedEventTarget,
  MessageStreamDirection
} from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

/**
 * On the producing side:
 * - Build messages with the signature, key (from may be enough for certain inlineable public key types), from and seqno fields.
 *
 * On the consuming side:
 * - Enforce the fields to be present, reject otherwise.
 * - Propagate only if the fields are valid and signature can be verified, reject otherwise.
 */
export const StrictSign = 'StrictSign'

/**
 * On the producing side:
 * - Build messages without the signature, key, from and seqno fields.
 * - The corresponding protobuf key-value pairs are absent from the marshaled message, not just empty.
 *
 * On the consuming side:
 * - Enforce the fields to be absent, reject otherwise.
 * - Propagate only if the fields are absent, reject otherwise.
 * - A message_id function will not be able to use the above fields, and should instead rely on the data field. A commonplace strategy is to calculate a hash.
 */
export const StrictNoSign = 'StrictNoSign'

export type SignaturePolicy = typeof StrictSign | typeof StrictNoSign

export enum TopicValidatorResult {
  /**
   * The message is considered valid, and it should be delivered and forwarded to the network
   */
  Accept = 'accept',
  /**
   * The message is neither delivered nor forwarded to the network
   */
  Ignore = 'ignore',
  /**
   * The message is considered invalid, and it should be rejected
   */
  Reject = 'reject'
}

export interface SignedMessage {
  type: 'signed'
  from: PeerId
  topic: string
  data: Uint8Array
  sequenceNumber: bigint
  signature: Uint8Array
  key: PublicKey
}

export interface UnsignedMessage {
  type: 'unsigned'
  topic: string
  data: Uint8Array
}

export type Message = SignedMessage | UnsignedMessage

export interface PublishResult {
  recipients: PeerId[]
}

export interface Subscription {
  topic: string
  subscribe: boolean
}

export interface SubscriptionChangeData {
  peerId: PeerId
  subscriptions: Subscription[]
}

export interface TopicValidatorFn {
  (peer: PeerId, message: Message): TopicValidatorResult | Promise<TopicValidatorResult>
}

export const multicodec: string = constants.GossipsubIDv12

export interface GossipsubOpts extends GossipsubOptsSpec {
  /** if dial should fallback to floodsub */
  fallbackToFloodsub: boolean
  /** if self-published messages should be sent to all peers */
  floodPublish: boolean
  /** serialize message once and send to all peers without control messages */
  batchPublish: boolean
  /** whether PX is enabled; this should be enabled in bootstrappers and other well connected/trusted nodes. */
  doPX: boolean
  /** peers with which we will maintain direct connections */
  directPeers: AddrInfo[]
  /**
   * If true will not forward messages to mesh peers until reportMessageValidationResult() is called.
   * Messages will be cached in mcache for some time after which they are evicted. Calling
   * reportMessageValidationResult() after the message is dropped from mcache won't forward the message.
   */
  asyncValidation: boolean
  /**
   * Do not throw `PublishError.NoPeersSubscribedToTopic` error if there are no
   * peers listening on the topic.
   *
   * N.B. if you sent this option to true, and you publish a message on a topic
   * with no peers listening on that topic, no other network node will ever
   * receive the message.
   */
  allowPublishToZeroTopicPeers: boolean
  /** Do not throw `PublishError.Duplicate` if publishing duplicate messages */
  ignoreDuplicatePublishError: boolean
  /** For a single stream, await processing each RPC before processing the next */
  awaitRpcHandler: boolean
  /** For a single RPC, await processing each message before processing the next */
  awaitRpcMessageHandler: boolean

  /** message id function */
  msgIdFn: MsgIdFn
  /** fast message id function */
  fastMsgIdFn: FastMsgIdFn
  /** Uint8Array message id to string function */
  msgIdToStrFn: MsgIdToStrFn
  /** override the default MessageCache */
  messageCache: MessageCache
  /** peer score parameters */
  scoreParams: Partial<PeerScoreParams>
  /** peer score thresholds */
  scoreThresholds: Partial<PeerScoreThresholds>
  /** customize GossipsubIWantFollowupTime in order not to apply IWANT penalties */
  gossipsubIWantFollowupMs: number

  /** override constants for fine tuning */
  prunePeers?: number
  pruneBackoff?: number
  unsubcribeBackoff?: number
  graftFloodThreshold?: number
  opportunisticGraftPeers?: number
  opportunisticGraftTicks?: number
  directConnectTicks?: number

  dataTransform?: DataTransform
  metricsRegister?: MetricsRegister | null
  metricsTopicStrToLabel?: TopicStrToLabel

  // Debug
  /** Prefix tag for debug logs */
  debugName?: string

  /**
   * Specify the maximum number of inbound gossipsub protocol
   * streams that are allowed to be open concurrently
   */
  maxInboundStreams?: number

  /**
   * Specify the maximum number of outbound gossipsub protocol
   * streams that are allowed to be open concurrently
   */
  maxOutboundStreams?: number

  /**
   * Pass true to run on limited connections - data or time-limited
   * connections that may be closed at any time such as circuit relay
   * connections.
   *
   * @default false
   */
  runOnLimitedConnection?: boolean

  /**
   * Specify max buffer size in bytes for OutboundStream.
   * If full it will throw and reject sending any more data.
   */
  maxOutboundBufferSize?: number

  /**
   * Specify max size to skip decoding messages whose data
   * section exceeds this size.
   *
   */
  maxInboundDataLength?: number

  /**
   * If provided, only allow topics in this list
   */
  allowedTopics?: string[] | Set<string>

  /**
   * Limits to bound protobuf decoding
   */
  decodeRpcLimits?: DecodeRPCLimits

  /**
   * If true, will utilize the libp2p connection manager tagging system to prune/graft connections to peers, defaults to true
   */
  tagMeshPeers: boolean

  /**
   * Specify what percent of peers to send gossip to. If the percent results in
   * a number smaller than `Dlazy`, `Dlazy` will be used instead.
   *
   * It should be a number between 0 and 1, with a reasonable default of 0.25
   */
  gossipFactor: number

  /**
   * The minimum message size in bytes to be considered for sending IDONTWANT messages
   *
   * @default 512
   */
  idontwantMinDataSize?: number

  /**
   * The maximum number of IDONTWANT messages per heartbeat per peer
   *
   * @default 512
   */
  idontwantMaxMessages?: number

  /**
   * Override the protocol registered with the registrar
   *
   * @default ['/floodsub/1.0.0']
   */
  protocols?: string[]

  /**
   * defines how signatures should be handled
   */
  globalSignaturePolicy?: SignaturePolicy

  /**
   * if can relay messages not subscribed
   */
  canRelayMessage?: boolean

  /**
   * if publish should emit to self, if subscribed
   */
  emitSelf?: boolean

  /**
   * handle this many incoming pubsub messages concurrently
   */
  messageProcessingConcurrency?: number
}

export interface GossipsubMessage {
  propagationSource: PeerId
  msgId: MsgIdStr
  msg: Message
}

export interface MeshPeer {
  peerId: string
  topic: string
  direction: MessageStreamDirection
}

export interface GossipSubEvents {
  'subscription-change': CustomEvent<SubscriptionChangeData>
  message: CustomEvent<Message>
  'gossipsub:heartbeat': CustomEvent
  'gossipsub:message': CustomEvent<GossipsubMessage>
  'gossipsub:graft': CustomEvent<MeshPeer>
  'gossipsub:prune': CustomEvent<MeshPeer>
}

export interface GossipSubComponents {
  privateKey: PrivateKey
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export interface GossipSub extends TypedEventTarget<GossipSubEvents> {
  /**
   * The global signature policy controls whether or not we sill send and receive
   * signed or unsigned messages.
   *
   * Signed messages prevent spoofing message senders and should be preferred to
   * using unsigned messages.
   */
  globalSignaturePolicy: typeof StrictSign | typeof StrictNoSign

  /**
   * A list of multicodecs that contain the pubsub protocol name.
   */
  protocols: string[]

  /**
   * Pubsub routers support message validators per topic, which will validate the message
   * before its propagations. They are stored in a map where keys are the topic name and
   * values are the validators.
   *
   * @example
   *
   * ```TypeScript
   * const topic = 'topic'
   * const validateMessage = (msgTopic, msg) => {
   *   const input = uint8ArrayToString(msg.data)
   *   const validInputs = ['a', 'b', 'c']
   *
   *   if (!validInputs.includes(input)) {
   *     throw new Error('no valid input received')
   *   }
   * }
   * libp2p.pubsub.topicValidators.set(topic, validateMessage)
   * ```
   */
  topicValidators: Map<string, TopicValidatorFn>

  getPeers(): PeerId[]

  /**
   * Gets a list of topics the node is subscribed to.
   *
   * ```TypeScript
   * const topics = libp2p.pubsub.getTopics()
   * ```
   */
  getTopics(): string[]

  /**
   * Subscribes to a pubsub topic.
   *
   * @example
   *
   * ```TypeScript
   * const topic = 'topic'
   * const handler = (msg) => {
   *   if (msg.topic === topic) {
   *     // msg.data - pubsub data received
   *   }
   * }
   *
   * libp2p.pubsub.addEventListener('message', handler)
   * libp2p.pubsub.subscribe(topic)
   * ```
   */
  subscribe(topic: string): void

  /**
   * Unsubscribes from a pubsub topic.
   *
   * @example
   *
   * ```TypeScript
   * const topic = 'topic'
   * const handler = (msg) => {
   *   // msg.data - pubsub data received
   * }
   *
   * libp2p.pubsub.removeEventListener(topic handler)
   * libp2p.pubsub.unsubscribe(topic)
   * ```
   */
  unsubscribe(topic: string): void

  /**
   * Gets a list of the PeerIds that are subscribed to one topic.
   *
   * @example
   *
   * ```TypeScript
   * const peerIds = libp2p.pubsub.getSubscribers(topic)
   * ```
   */
  getSubscribers(topic: string): PeerId[]

  /**
   * Publishes messages to the given topic.
   *
   * @example
   *
   * ```TypeScript
   * const topic = 'topic'
   * const data = uint8ArrayFromString('data')
   *
   * await libp2p.pubsub.publish(topic, data)
   * ```
   */
  publish(topic: string, data?: Uint8Array): Promise<PublishResult>
}

export function gossipsub (
  init: Partial<GossipsubOpts> = {}
): (components: GossipSubComponents) => GossipSub {
  return (components: GossipSubComponents) => new GossipSubClass(components, init)
}

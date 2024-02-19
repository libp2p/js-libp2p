import type { Stream } from '../connection/index.js'
import type { TypedEventTarget } from '../event-target.js'
import type { PeerId } from '../peer-id/index.js'
import type { Pushable } from 'it-pushable'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * On the producing side:
 * * Build messages with the signature, key (from may be enough for certain inlineable public key types), from and seqno fields.
 *
 * On the consuming side:
 * * Enforce the fields to be present, reject otherwise.
 * * Propagate only if the fields are valid and signature can be verified, reject otherwise.
 */
export const StrictSign = 'StrictSign'

/**
 * On the producing side:
 * * Build messages without the signature, key, from and seqno fields.
 * * The corresponding protobuf key-value pairs are absent from the marshalled message, not just empty.
 *
 * On the consuming side:
 * * Enforce the fields to be absent, reject otherwise.
 * * Propagate only if the fields are absent, reject otherwise.
 * * A message_id function will not be able to use the above fields, and should instead rely on the data field. A commonplace strategy is to calculate a hash.
 */
export const StrictNoSign = 'StrictNoSign'

export type SignaturePolicy = typeof StrictSign | typeof StrictNoSign

export interface SignedMessage {
  type: 'signed'
  from: PeerId
  topic: string
  data: Uint8Array
  sequenceNumber: bigint
  signature: Uint8Array
  key: Uint8Array
}

export interface UnsignedMessage {
  type: 'unsigned'
  topic: string
  data: Uint8Array
}

export type Message = SignedMessage | UnsignedMessage

export interface PubSubRPCMessage {
  from?: Uint8Array
  topic?: string
  data?: Uint8Array
  sequenceNumber?: Uint8Array
  signature?: Uint8Array
  key?: Uint8Array
}

export interface PubSubRPCSubscription {
  subscribe?: boolean
  topic?: string
}

export interface PubSubRPC {
  subscriptions: PubSubRPCSubscription[]
  messages: PubSubRPCMessage[]
}

export interface PeerStreams extends TypedEventTarget<PeerStreamEvents> {
  id: PeerId
  protocol: string
  outboundStream?: Pushable<Uint8ArrayList>
  inboundStream?: AsyncIterable<Uint8ArrayList>
  isWritable: boolean

  close(): void
  write(buf: Uint8Array | Uint8ArrayList): void
  attachInboundStream(stream: Stream): AsyncIterable<Uint8ArrayList>
  attachOutboundStream(stream: Stream): Promise<Pushable<Uint8ArrayList>>
}

export interface PubSubInit {
  enabled?: boolean

  multicodecs?: string[]

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

  /**
   * How many parallel incoming streams to allow on the pubsub protocol per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outgoing streams to allow on the pubsub protocol per-connection
   */
  maxOutboundStreams?: number
}

interface Subscription {
  topic: string
  subscribe: boolean
}

export interface SubscriptionChangeData {
  peerId: PeerId
  subscriptions: Subscription[]
}

export interface PubSubEvents {
  'subscription-change': CustomEvent<SubscriptionChangeData>
  'message': CustomEvent<Message>
}

export interface PublishResult {
  recipients: PeerId[]
}

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

export interface TopicValidatorFn {
  (peer: PeerId, message: Message): TopicValidatorResult | Promise<TopicValidatorResult>
}

export interface PubSub<Events extends Record<string, any> = PubSubEvents> extends TypedEventTarget<Events> {
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
  multicodecs: string[]

  /**
   * Pubsub routers support message validators per topic, which will validate the message
   * before its propagations. They are stored in a map where keys are the topic name and
   * values are the validators.
   *
   * @example
   *
   * ```js
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
   * ```js
   * const topics = libp2p.pubsub.getTopics()
   * ```
   */
  getTopics(): string[]

  /**
   * Subscribes to a pubsub topic.
   *
   * @example
   *
   * ```js
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
   * ```js
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
   * ```js
   * const peerIds = libp2p.pubsub.getSubscribers(topic)
   * ```
   */
  getSubscribers(topic: string): PeerId[]

  /**
   * Publishes messages to the given topic.
   *
   * @example
   *
   * ```js
   * const topic = 'topic'
   * const data = uint8ArrayFromString('data')
   *
   * await libp2p.pubsub.publish(topic, data)
   * ```
   */
  publish(topic: string, data: Uint8Array): Promise<PublishResult>
}

export interface PeerStreamEvents {
  'stream:inbound': CustomEvent<never>
  'stream:outbound': CustomEvent<never>
  'close': CustomEvent<never>
}

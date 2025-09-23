/**
 * @packageDocumentation
 *
 * > Don't use this module
 *
 * This module is a naive implementation of pubsub. It broadcasts all messages to all network peers, cannot provide older messages and has no protection against bad actors.
 *
 * It exists for academic purposes only, you should not use it in production.
 *
 * Instead please use [gossipsub](https://www.npmjs.com/package/@chainsafe/libp2p-gossipsub) - a more complete implementation which is also compatible with floodsub.
 *
 * @example Configuring libp2p to use floodsub
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { floodsub } from '@libp2p/floodsub'
 *
 * const node = await createLibp2p({
 *   services: {
 *     pubsub: floodsub()
 *   }
 *   //... other options
 * })
 * await node.start()
 *
 * node.services.pubsub.subscribe('fruit')
 * node.services.pubsub.addEventListener('message', (evt) => {
 *   console.log(evt)
 * })
 *
 * node.services.pubsub.publish('fruit', new TextEncoder().encode('banana'))
 * ```
 */

import { pubSubSymbol } from './constants.ts'
import { FloodSub as FloodSubClass } from './floodsub.js'
import type { ComponentLogger, PeerId, PrivateKey, PublicKey, TypedEventTarget } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

export const protocol = '/floodsub/1.0.0'

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

export interface Subscription {
  topic: string
  subscribe: boolean
}

export interface SubscriptionChangeData {
  peerId: PeerId
  subscriptions: Subscription[]
}

export interface FloodSubEvents {
  'subscription-change': CustomEvent<SubscriptionChangeData>
  message: CustomEvent<Message>
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

export interface PeerStreamEvents {
  'stream:inbound': CustomEvent<never>
  'stream:outbound': CustomEvent<never>
  close: CustomEvent<never>
}

export { pubSubSymbol }

/**
 * Returns true if the passed argument is a PubSub implementation
 */
export function isPubSub (obj?: any): obj is FloodSub {
  return Boolean(obj?.[pubSubSymbol])
}

export interface FloodSub extends TypedEventTarget<FloodSubEvents> {
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

export interface FloodSubComponents {
  peerId: PeerId
  privateKey: PrivateKey
  registrar: Registrar
  logger: ComponentLogger
}

export interface FloodSubInit {
  seenTTL?: number

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

  /**
   * How many parallel incoming streams to allow on the pubsub protocol per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outgoing streams to allow on the pubsub protocol per-connection
   */
  maxOutboundStreams?: number
}

export function floodsub (init: FloodSubInit = {}): (components: FloodSubComponents) => FloodSub {
  return (components: FloodSubComponents) => new FloodSubClass(components, init)
}

/**
 * @packageDocumentation
 *
 * A set of components to be extended in order to create a pubsub implementation.
 *
 * @example
 *
 * ```TypeScript
 * import { PubSubBaseProtocol } from '@libp2p/pubsub'
 * import type { PubSubRPC, PublishResult, PubSubRPCMessage, PeerId, Message } from '@libp2p/interface'
 * import type { Uint8ArrayList } from 'uint8arraylist'
 *
 * class MyPubsubImplementation extends PubSubBaseProtocol {
 *   decodeRpc (bytes: Uint8Array | Uint8ArrayList): PubSubRPC {
 *     throw new Error('Not implemented')
 *   }
 *
 *   encodeRpc (rpc: PubSubRPC): Uint8Array {
 *     throw new Error('Not implemented')
 *   }
 *
 *   encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
 *     throw new Error('Not implemented')
 *   }
 *
 *   async publishMessage (sender: PeerId, message: Message): Promise<PublishResult> {
 *     throw new Error('Not implemented')
 *   }
 * }
 * ```
 */

import { TopicValidatorResult, InvalidMessageError, NotStartedError, InvalidParametersError } from '@libp2p/interface'
import { PeerMap, PeerSet } from '@libp2p/peer-collections'
import { pipe } from 'it-pipe'
import { TypedEventEmitter } from 'main-event'
import Queue from 'p-queue'
import { PeerStreams as PeerStreamsImpl } from './peer-streams.js'
import {
  signMessage,
  verifySignature
} from './sign.js'
import { toMessage, ensureArray, noSignMsgId, msgId, toRpcMessage, randomSeqno } from './utils.js'
import type { PubSub, Message, StrictNoSign, StrictSign, PubSubInit, PubSubEvents, PeerStreams, PubSubRPCMessage, PubSubRPC, PubSubRPCSubscription, SubscriptionChangeData, PublishResult, TopicValidatorFn, ComponentLogger, Logger, Connection, PeerId, PrivateKey, IncomingStreamData } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PubSubComponents {
  peerId: PeerId
  privateKey: PrivateKey
  registrar: Registrar
  logger: ComponentLogger
}

/**
 * PubSubBaseProtocol handles the peers and connections logic for pubsub routers
 * and specifies the API that pubsub routers should have.
 */
export abstract class PubSubBaseProtocol<Events extends Record<string, any> = PubSubEvents> extends TypedEventEmitter<Events> implements PubSub<Events> {
  protected log: Logger

  public started: boolean
  /**
   * Map of topics to which peers are subscribed to
   */
  public topics: Map<string, PeerSet>
  /**
   * List of our subscriptions
   */
  public subscriptions: Set<string>
  /**
   * Map of peer streams
   */
  public peers: PeerMap<PeerStreams>
  /**
   * The signature policy to follow by default
   */
  public globalSignaturePolicy: typeof StrictNoSign | typeof StrictSign
  /**
   * If router can relay received messages, even if not subscribed
   */
  public canRelayMessage: boolean
  /**
   * if publish should emit to self, if subscribed
   */
  public emitSelf: boolean
  /**
   * Topic validator map
   *
   * Keyed by topic
   * Topic validators are functions with the following input:
   */
  public topicValidators: Map<string, TopicValidatorFn>
  public queue: Queue
  public multicodecs: string[]
  public components: PubSubComponents

  private _registrarTopologyIds: string[] | undefined
  protected enabled: boolean
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number

  constructor (components: PubSubComponents, props: PubSubInit) {
    super()

    const {
      multicodecs = [],
      globalSignaturePolicy = 'StrictSign',
      canRelayMessage = false,
      emitSelf = false,
      messageProcessingConcurrency = 10,
      maxInboundStreams = 1,
      maxOutboundStreams = 1
    } = props

    this.log = components.logger.forComponent('libp2p:pubsub')
    this.components = components
    this.multicodecs = ensureArray(multicodecs)
    this.enabled = props.enabled !== false
    this.started = false
    this.topics = new Map()
    this.subscriptions = new Set()
    this.peers = new PeerMap<PeerStreams>()
    this.globalSignaturePolicy = globalSignaturePolicy === 'StrictNoSign' ? 'StrictNoSign' : 'StrictSign'
    this.canRelayMessage = canRelayMessage
    this.emitSelf = emitSelf
    this.topicValidators = new Map()
    this.queue = new Queue({ concurrency: messageProcessingConcurrency })
    this.maxInboundStreams = maxInboundStreams
    this.maxOutboundStreams = maxOutboundStreams

    this._onIncomingStream = this._onIncomingStream.bind(this)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)
  }

  // LIFECYCLE METHODS

  /**
   * Register the pubsub protocol onto the libp2p node.
   */
  async start (): Promise<void> {
    if (this.started || !this.enabled) {
      return
    }

    this.log('starting')

    const registrar = this.components.registrar
    // Incoming streams
    // Called after a peer dials us
    await Promise.all(this.multicodecs.map(async multicodec => {
      await registrar.handle(multicodec, this._onIncomingStream, {
        maxInboundStreams: this.maxInboundStreams,
        maxOutboundStreams: this.maxOutboundStreams
      })
    }))

    // register protocol with topology
    // Topology callbacks called on connection manager changes
    const topology = {
      onConnect: this._onPeerConnected,
      onDisconnect: this._onPeerDisconnected
    }
    this._registrarTopologyIds = await Promise.all(this.multicodecs.map(async multicodec => registrar.register(multicodec, topology)))

    this.log('started')
    this.started = true
  }

  /**
   * Unregister the pubsub protocol and the streams with other peers will be closed.
   */
  async stop (): Promise<void> {
    if (!this.started || !this.enabled) {
      return
    }

    const registrar = this.components.registrar

    // unregister protocol and handlers
    if (this._registrarTopologyIds != null) {
      this._registrarTopologyIds?.forEach(id => {
        registrar.unregister(id)
      })
    }

    await Promise.all(this.multicodecs.map(async multicodec => {
      await registrar.unhandle(multicodec)
    }))

    this.log('stopping')
    for (const peerStreams of this.peers.values()) {
      peerStreams.close()
    }

    this.peers.clear()
    this.subscriptions = new Set()
    this.started = false
    this.log('stopped')
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * On an inbound stream opened
   */
  protected _onIncomingStream (data: IncomingStreamData): void {
    const { stream, connection } = data
    const peerId = connection.remotePeer

    if (stream.protocol == null) {
      stream.abort(new Error('Stream was not multiplexed'))
      return
    }

    const peer = this.addPeer(peerId, stream.protocol)
    const inboundStream = peer.attachInboundStream(stream)

    this.processMessages(peerId, inboundStream, peer)
      .catch(err => { this.log(err) })
  }

  /**
   * Registrar notifies an established connection with pubsub protocol
   */
  protected _onPeerConnected (peerId: PeerId, conn: Connection): void {
    this.log('connected %p', peerId)

    // if this connection is already in use for pubsub, ignore it
    if (conn.streams.find(stream => stream.direction === 'outbound' && stream.protocol != null && this.multicodecs.includes(stream.protocol)) != null) {
      this.log('outbound pubsub streams already present on connection from %p', peerId)
      return
    }

    void Promise.resolve().then(async () => {
      try {
        const stream = await conn.newStream(this.multicodecs)

        if (stream.protocol == null) {
          stream.abort(new Error('Stream was not multiplexed'))
          return
        }

        const peer = this.addPeer(peerId, stream.protocol)
        await peer.attachOutboundStream(stream)
      } catch (err: any) {
        this.log.error(err)
      }

      // Immediately send my own subscriptions to the newly established conn
      this.send(peerId, { subscriptions: Array.from(this.subscriptions).map(sub => sub.toString()), subscribe: true })
    })
      .catch(err => {
        this.log.error(err)
      })
  }

  /**
   * Registrar notifies a closing connection with pubsub protocol
   */
  protected _onPeerDisconnected (peerId: PeerId, conn?: Connection): void {
    this.log('connection ended %p', peerId)
    this._removePeer(peerId)
  }

  /**
   * Notifies the router that a peer has been connected
   */
  addPeer (peerId: PeerId, protocol: string): PeerStreams {
    const existing = this.peers.get(peerId)

    // If peer streams already exists, do nothing
    if (existing != null) {
      return existing
    }

    // else create a new peer streams
    this.log('new peer %p', peerId)

    const peerStreams: PeerStreams = new PeerStreamsImpl(this.components, {
      id: peerId,
      protocol
    })

    this.peers.set(peerId, peerStreams)
    peerStreams.addEventListener('close', () => this._removePeer(peerId), {
      once: true
    })

    return peerStreams
  }

  /**
   * Notifies the router that a peer has been disconnected
   */
  protected _removePeer (peerId: PeerId): PeerStreams | undefined {
    const peerStreams = this.peers.get(peerId)
    if (peerStreams == null) {
      return
    }

    // close peer streams
    peerStreams.close()

    // delete peer streams
    this.log('delete peer %p', peerId)
    this.peers.delete(peerId)

    // remove peer from topics map
    for (const peers of this.topics.values()) {
      peers.delete(peerId)
    }

    return peerStreams
  }

  // MESSAGE METHODS

  /**
   * Responsible for processing each RPC message received by other peers.
   */
  async processMessages (peerId: PeerId, stream: AsyncIterable<Uint8ArrayList>, peerStreams: PeerStreams): Promise<void> {
    try {
      await pipe(
        stream,
        async (source) => {
          for await (const data of source) {
            const rpcMsg = this.decodeRpc(data)
            const messages: PubSubRPCMessage[] = []

            for (const msg of (rpcMsg.messages ?? [])) {
              if (msg.from == null || msg.data == null || msg.topic == null) {
                this.log('message from %p was missing from, data or topic fields, dropping', peerId)
                continue
              }

              messages.push({
                from: msg.from,
                data: msg.data,
                topic: msg.topic,
                sequenceNumber: msg.sequenceNumber ?? undefined,
                signature: msg.signature ?? undefined,
                key: msg.key ?? undefined
              })
            }

            // Since processRpc may be overridden entirely in unsafe ways,
            // the simplest/safest option here is to wrap in a function and capture all errors
            // to prevent a top-level unhandled exception
            // This processing of rpc messages should happen without awaiting full validation/execution of prior messages
            this.processRpc(peerId, peerStreams, {
              subscriptions: (rpcMsg.subscriptions ?? []).map(sub => ({
                subscribe: Boolean(sub.subscribe),
                topic: sub.topic ?? ''
              })),
              messages
            })
              .catch(err => { this.log(err) })
          }
        }
      )
    } catch (err: any) {
      this._onPeerDisconnected(peerStreams.id, err)
    }
  }

  /**
   * Handles an rpc request from a peer
   */
  async processRpc (from: PeerId, peerStreams: PeerStreams, rpc: PubSubRPC): Promise<boolean> {
    if (!this.acceptFrom(from)) {
      this.log('received message from unacceptable peer %p', from)
      return false
    }

    this.log('rpc from %p', from)

    const { subscriptions, messages } = rpc

    if (subscriptions != null && subscriptions.length > 0) {
      this.log('subscription update from %p', from)

      // update peer subscriptions
      subscriptions.forEach((subOpt) => {
        this.processRpcSubOpt(from, subOpt)
      })

      super.dispatchEvent(new CustomEvent<SubscriptionChangeData>('subscription-change', {
        detail: {
          peerId: peerStreams.id,
          subscriptions: subscriptions.map(({ topic, subscribe }) => ({
            topic: `${topic ?? ''}`,
            subscribe: Boolean(subscribe)
          }))
        }
      }))
    }

    if (messages != null && messages.length > 0) {
      this.log('messages from %p', from)

      this.queue.addAll(messages.map(message => async () => {
        if (message.topic == null || (!this.subscriptions.has(message.topic) && !this.canRelayMessage)) {
          this.log('received message we didn\'t subscribe to. Dropping.')
          return false
        }

        try {
          const msg = await toMessage(message)

          await this.processMessage(from, msg)
        } catch (err: any) {
          this.log.error(err)
        }
      }))
        .catch(err => { this.log(err) })
    }

    return true
  }

  /**
   * Handles a subscription change from a peer
   */
  processRpcSubOpt (id: PeerId, subOpt: PubSubRPCSubscription): void {
    const t = subOpt.topic

    if (t == null) {
      return
    }

    let topicSet = this.topics.get(t)
    if (topicSet == null) {
      topicSet = new PeerSet()
      this.topics.set(t, topicSet)
    }

    if (subOpt.subscribe === true) {
      // subscribe peer to new topic
      topicSet.add(id)
    } else {
      // unsubscribe from existing topic
      topicSet.delete(id)
    }
  }

  /**
   * Handles a message from a peer
   */
  async processMessage (from: PeerId, msg: Message): Promise<void> {
    if (this.components.peerId.equals(from) && !this.emitSelf) {
      return
    }

    // Ensure the message is valid before processing it
    try {
      await this.validate(from, msg)
    } catch (err: any) {
      this.log('Message is invalid, dropping it. %O', err)
      return
    }

    if (this.subscriptions.has(msg.topic)) {
      const isFromSelf = this.components.peerId.equals(from)

      if (!isFromSelf || this.emitSelf) {
        super.dispatchEvent(new CustomEvent<Message>('message', {
          detail: msg
        }))
      }
    }

    await this.publishMessage(from, msg)
  }

  /**
   * The default msgID implementation
   * Child class can override this.
   */
  getMsgId (msg: Message): Promise<Uint8Array> | Uint8Array {
    const signaturePolicy = this.globalSignaturePolicy
    switch (signaturePolicy) {
      case 'StrictSign':
        if (msg.type !== 'signed') {
          throw new InvalidMessageError('Message type should be "signed" when signature policy is StrictSign but it was not')
        }

        if (msg.sequenceNumber == null) {
          throw new InvalidMessageError('Need sequence number when signature policy is StrictSign but it was missing')
        }

        if (msg.key == null) {
          throw new InvalidMessageError('Need key when signature policy is StrictSign but it was missing')
        }

        return msgId(msg.key, msg.sequenceNumber)
      case 'StrictNoSign':
        return noSignMsgId(msg.data)
      default:
        throw new InvalidMessageError('Cannot get message id: unhandled signature policy')
    }
  }

  /**
   * Whether to accept a message from a peer
   * Override to create a gray list
   */
  acceptFrom (id: PeerId): boolean {
    return true
  }

  /**
   * Decode Uint8Array into an RPC object.
   * This can be override to use a custom router protobuf.
   */
  abstract decodeRpc (bytes: Uint8Array | Uint8ArrayList): PubSubRPC

  /**
   * Encode RPC object into a Uint8Array.
   * This can be override to use a custom router protobuf.
   */
  abstract encodeRpc (rpc: PubSubRPC): Uint8Array

  /**
   * Encode RPC object into a Uint8Array.
   * This can be override to use a custom router protobuf.
   */
  abstract encodeMessage (rpc: PubSubRPCMessage): Uint8Array

  /**
   * Send an rpc object to a peer
   */
  send (peer: PeerId, data: { messages?: Message[], subscriptions?: string[], subscribe?: boolean }): void {
    const { messages, subscriptions, subscribe } = data

    this.sendRpc(peer, {
      subscriptions: (subscriptions ?? []).map(str => ({ topic: str, subscribe: Boolean(subscribe) })),
      messages: (messages ?? []).map(toRpcMessage)
    })
  }

  /**
   * Send an rpc object to a peer
   */
  sendRpc (peer: PeerId, rpc: PubSubRPC): void {
    const peerStreams = this.peers.get(peer)

    if (peerStreams == null) {
      this.log.error('Cannot send RPC to %p as there are no streams to it available', peer)

      return
    }

    if (!peerStreams.isWritable) {
      this.log.error('Cannot send RPC to %p as there is no outbound stream to it available', peer)

      return
    }

    peerStreams.write(this.encodeRpc(rpc))
  }

  /**
   * Validates the given message. The signature will be checked for authenticity.
   * Throws an error on invalid messages
   */
  async validate (from: PeerId, message: Message): Promise<void> {
    const signaturePolicy = this.globalSignaturePolicy
    switch (signaturePolicy) {
      case 'StrictNoSign':
        if (message.type !== 'unsigned') {
          throw new InvalidMessageError('Message type should be "unsigned" when signature policy is StrictNoSign but it was not')
        }

        // @ts-expect-error should not be present
        if (message.signature != null) {
          throw new InvalidMessageError('StrictNoSigning: signature should not be present')
        }

        // @ts-expect-error should not be present
        if (message.key != null) {
          throw new InvalidMessageError('StrictNoSigning: key should not be present')
        }

        // @ts-expect-error should not be present
        if (message.sequenceNumber != null) {
          throw new InvalidMessageError('StrictNoSigning: seqno should not be present')
        }
        break
      case 'StrictSign':
        if (message.type !== 'signed') {
          throw new InvalidMessageError('Message type should be "signed" when signature policy is StrictSign but it was not')
        }

        if (message.signature == null) {
          throw new InvalidMessageError('StrictSigning: Signing required and no signature was present')
        }

        if (message.sequenceNumber == null) {
          throw new InvalidMessageError('StrictSigning: Signing required and no sequenceNumber was present')
        }

        if (!(await verifySignature(message, this.encodeMessage.bind(this)))) {
          throw new InvalidMessageError('StrictSigning: Invalid message signature')
        }

        break
      default:
        throw new InvalidMessageError('Cannot validate message: unhandled signature policy')
    }

    const validatorFn = this.topicValidators.get(message.topic)
    if (validatorFn != null) {
      const result = await validatorFn(from, message)
      if (result === TopicValidatorResult.Reject || result === TopicValidatorResult.Ignore) {
        throw new InvalidMessageError('Message validation failed')
      }
    }
  }

  /**
   * Normalizes the message and signs it, if signing is enabled.
   * Should be used by the routers to create the message to send.
   */
  async buildMessage (message: { from: PeerId, topic: string, data: Uint8Array, sequenceNumber: bigint }): Promise<Message> {
    const signaturePolicy = this.globalSignaturePolicy
    switch (signaturePolicy) {
      case 'StrictSign':
        return signMessage(this.components.privateKey, message, this.encodeMessage.bind(this))
      case 'StrictNoSign':
        return Promise.resolve({
          type: 'unsigned',
          ...message
        })
      default:
        throw new InvalidMessageError('Cannot build message: unhandled signature policy')
    }
  }

  // API METHODS

  /**
   * Get a list of the peer-ids that are subscribed to one topic.
   */
  getSubscribers (topic: string): PeerId[] {
    if (!this.started) {
      throw new NotStartedError('not started yet')
    }

    if (topic == null) {
      throw new InvalidParametersError('Topic is required')
    }

    const peersInTopic = this.topics.get(topic.toString())

    if (peersInTopic == null) {
      return []
    }

    return Array.from(peersInTopic.values())
  }

  /**
   * Publishes messages to all subscribed peers
   */
  async publish (topic: string, data?: Uint8Array): Promise<PublishResult> {
    if (!this.started) {
      throw new Error('Pubsub has not started')
    }

    const message = {
      from: this.components.peerId,
      topic,
      data: data ?? new Uint8Array(0),
      sequenceNumber: randomSeqno()
    }

    this.log('publish topic: %s from: %p data: %m', topic, message.from, message.data)

    const rpcMessage = await this.buildMessage(message)
    let emittedToSelf = false

    // dispatch the event if we are interested
    if (this.emitSelf) {
      if (this.subscriptions.has(topic)) {
        emittedToSelf = true
        super.dispatchEvent(new CustomEvent<Message>('message', {
          detail: rpcMessage
        }))
      }
    }

    // send to all the other peers
    const result = await this.publishMessage(this.components.peerId, rpcMessage)

    if (emittedToSelf) {
      result.recipients = [...result.recipients, this.components.peerId]
    }

    return result
  }

  /**
   * Overriding the implementation of publish should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply publish each message to each topic for every peer.
   *
   * `sender` might be this peer, or we might be forwarding a message on behalf of another peer, in which case sender
   * is the peer we received the message from, which may not be the peer the message was created by.
   */
  abstract publishMessage (sender: PeerId, message: Message): Promise<PublishResult>

  /**
   * Subscribes to a given topic.
   */
  subscribe (topic: string): void {
    if (!this.started) {
      throw new Error('Pubsub has not started')
    }

    this.log('subscribe to topic: %s', topic)

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.add(topic)

      for (const peerId of this.peers.keys()) {
        this.send(peerId, { subscriptions: [topic], subscribe: true })
      }
    }
  }

  /**
   * Unsubscribe from the given topic
   */
  unsubscribe (topic: string): void {
    if (!this.started) {
      throw new Error('Pubsub is not started')
    }

    super.removeEventListener(topic)

    const wasSubscribed = this.subscriptions.has(topic)

    this.log('unsubscribe from %s - am subscribed %s', topic, wasSubscribed)

    if (wasSubscribed) {
      this.subscriptions.delete(topic)

      for (const peerId of this.peers.keys()) {
        this.send(peerId, { subscriptions: [topic], subscribe: false })
      }
    }
  }

  /**
   * Get the list of topics which the peer is subscribed to.
   */
  getTopics (): string[] {
    if (!this.started) {
      throw new Error('Pubsub is not started')
    }

    return Array.from(this.subscriptions)
  }

  getPeers (): PeerId[] {
    if (!this.started) {
      throw new Error('Pubsub is not started')
    }

    return Array.from(this.peers.keys())
  }
}

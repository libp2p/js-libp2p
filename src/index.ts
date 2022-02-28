import { toString } from 'uint8arrays/to-string'
import { PubsubBaseProtocol } from '@libp2p/pubsub'
import { multicodec } from './config.js'
import { SimpleTimeCache } from './cache.js'
import type { PubSub, PubSubEvents, PubSubOptions, Message } from '@libp2p/interfaces/pubsub'
import type { PeerId } from '@libp2p/interfaces/peer-id'

const debugName = 'libp2p:floodsub'

export { multicodec }

export interface FloodSubOptions extends PubSubOptions {
  seenTTL?: number
}

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
export class FloodSub <EventMap extends PubSubEvents = PubSubEvents> extends PubsubBaseProtocol<EventMap> implements PubSub<EventMap & PubSubEvents> {
  public seenCache: SimpleTimeCache<boolean>

  constructor (options: FloodSubOptions) {
    super({
      ...options,
      debugName: debugName,
      canRelayMessage: true,
      multicodecs: [multicodec]
    })

    /**
     * Cache of seen messages
     *
     * @type {TimeCache}
     */
    this.seenCache = new SimpleTimeCache<boolean>({
      validityMs: options.seenTTL ?? 30000
    })
  }

  /**
   * Process incoming message
   * Extends base implementation to check router cache.
   */
  async processMessage (from: PeerId, message: Message) {
    // Check if I've seen the message, if yes, ignore
    const seqno = await super.getMsgId(message)
    const msgIdStr = toString(seqno, 'base64')

    if (this.seenCache.has(msgIdStr)) {
      return
    }

    this.seenCache.put(msgIdStr, true)

    await super.processMessage(from, message)
  }

  /**
   * Publish message created. Forward it to the peers.
   */
  async publishMessage (from: PeerId, message: Message) {
    const peers = this.getSubscribers(message.topic)

    if (peers == null || peers.length === 0) {
      this.log('no peers are subscribed to topic %s', message.topic)
      return
    }

    peers.forEach(id => {
      if (this.peerId.equals(id)) {
        this.log('not sending message on topic %s to myself', message.topic)
        return
      }

      if (id.equals(from)) {
        this.log('not sending message on topic %s to sender %p', message.topic, id)
        return
      }

      this.log('publish msgs on topics %s %p', message.topic, id)

      this.send(id, { messages: [message] })
    })
  }
}

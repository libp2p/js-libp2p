import { toString } from 'uint8arrays/to-string'
import { PubSubBaseProtocol } from '@libp2p/pubsub'
import { multicodec } from './config.js'
import { SimpleTimeCache } from './cache.js'
import type { PubSubInit, Message, PubSubRPC, PubSubRPCMessage, PublishResult } from '@libp2p/interfaces/pubsub'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { logger } from '@libp2p/logger'
import { RPC } from './message/rpc.js'

const log = logger('libp2p:floodsub')

export { multicodec }

export interface FloodSubInit extends PubSubInit {
  seenTTL?: number
}

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
export class FloodSub extends PubSubBaseProtocol {
  public seenCache: SimpleTimeCache<boolean>

  constructor (init?: FloodSubInit) {
    super({
      ...init,
      canRelayMessage: true,
      multicodecs: [multicodec]
    })

    /**
     * Cache of seen messages
     *
     * @type {TimeCache}
     */
    this.seenCache = new SimpleTimeCache<boolean>({
      validityMs: init?.seenTTL ?? 30000
    })
  }

  /**
   * Decode a Uint8Array into an RPC object
   */
  decodeRpc (bytes: Uint8Array): PubSubRPC {
    return RPC.decode(bytes)
  }

  /**
   * Encode an RPC object into a Uint8Array
   */
  encodeRpc (rpc: PubSubRPC): Uint8Array {
    return RPC.encode(rpc)
  }

  decodeMessage (bytes: Uint8Array): PubSubRPCMessage {
    return RPC.Message.decode(bytes)
  }

  encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
    return RPC.Message.encode(rpc)
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
  async publishMessage (from: PeerId, message: Message): Promise<PublishResult> {
    const peers = this.getSubscribers(message.topic)
    const recipients: PeerId[] = []

    if (peers == null || peers.length === 0) {
      log('no peers are subscribed to topic %s', message.topic)
      return { recipients }
    }

    peers.forEach(id => {
      if (this.components.getPeerId().equals(id)) {
        log('not sending message on topic %s to myself', message.topic)
        return
      }

      if (id.equals(from)) {
        log('not sending message on topic %s to sender %p', message.topic, id)
        return
      }

      log('publish msgs on topics %s %p', message.topic, id)

      recipients.push(id)
      this.send(id, { messages: [message] })
    })

    return { recipients }
  }
}

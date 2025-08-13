/* eslint max-depth: ["error", 6] */

import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import {
  PSMessage
} from '@libp2p/daemon-protocol'
import { logger } from '@libp2p/logger'
import { pushable } from 'it-pushable'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { ErrorResponse, OkResponse } from './responses.js'
import type { GossipSub } from '@chainsafe/libp2p-gossipsub'

const log = logger('libp2p:daemon-server:pubsub')

export interface PubSubOperationsInit {
  pubsub: GossipSub
}

export class PubSubOperations {
  private readonly pubsub: GossipSub

  constructor (init: PubSubOperationsInit) {
    const { pubsub } = init

    this.pubsub = pubsub
  }

  async * getTopics (): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      yield OkResponse({
        pubsub: {
          topics: this.pubsub.getTopics(),
          peerIDs: []
        }
      })
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * subscribe (topic: string): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      const onMessage = pushable()
      this.pubsub.subscribe(topic)

      this.pubsub.addEventListener('message', (evt) => {
        const msg = evt.detail

        if (msg.topic !== topic) {
          return
        }

        if (msg.type === 'signed') {
          onMessage.push(PSMessage.encode({
            from: msg.from.toMultihash().bytes,
            data: msg.data,
            seqno: msg.sequenceNumber == null ? undefined : uint8ArrayFromString(msg.sequenceNumber.toString(16).padStart(16, '0'), 'base16'),
            topicIDs: [msg.topic],
            signature: msg.signature,
            key: publicKeyToProtobuf(msg.key)
          }).subarray())
        } else {
          onMessage.push(PSMessage.encode({
            data: msg.data,
            topicIDs: [msg.topic]
          }).subarray())
        }
      })

      yield OkResponse()
      yield * onMessage
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * publish (topic: string, data: Uint8Array): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      await this.pubsub.publish(topic, data)
      yield OkResponse()
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * listPeers (topic: string): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      yield OkResponse({
        pubsub: {
          topics: [topic],
          peerIDs: this.pubsub.getSubscribers(topic).map(peer => peer.toMultihash().bytes)
        }
      })
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }
}

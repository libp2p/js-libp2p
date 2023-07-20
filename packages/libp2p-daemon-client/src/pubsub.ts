import {
  Request,
  Response,
  PSRequest,
  PSMessage
} from '@libp2p/daemon-protocol'
import { CodeError } from '@libp2p/interface/errors'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { DaemonClient, Subscription } from './index.js'
import type { PeerId } from '@libp2p/interface/peer-id'

export class Pubsub {
  private readonly client: DaemonClient

  constructor (client: DaemonClient) {
    this.client = client
  }

  /**
   * Get a list of topics the node is subscribed to.
   *
   * @returns {Array<string>} topics
   */
  async getTopics (): Promise<string[]> {
    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.GET_TOPICS
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'Pubsub get topics failed', 'ERR_PUBSUB_GET_TOPICS_FAILED')
    }

    if (response.pubsub == null || response.pubsub.topics == null) {
      throw new CodeError('Invalid response', 'ERR_PUBSUB_GET_TOPICS_FAILED')
    }

    return response.pubsub.topics
  }

  /**
   * Publish data under a topic
   */
  async publish (topic: string, data: Uint8Array): Promise<void> {
    if (typeof topic !== 'string') {
      throw new CodeError('invalid topic received', 'ERR_INVALID_TOPIC')
    }

    if (!(data instanceof Uint8Array)) {
      throw new CodeError('data received is not a Uint8Array', 'ERR_INVALID_DATA')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.PUBLISH,
        topic,
        data
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'Pubsub publish failed', 'ERR_PUBSUB_PUBLISH_FAILED')
    }
  }

  /**
   * Request to subscribe a certain topic
   */
  async subscribe (topic: string): Promise<Subscription> {
    if (typeof topic !== 'string') {
      throw new CodeError('invalid topic received', 'ERR_INVALID_TOPIC')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.SUBSCRIBE,
        topic
      }
    })

    let message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'Pubsub publish failed', 'ERR_PUBSUB_PUBLISH_FAILED')
    }

    let subscribed = true

    const subscription: Subscription = {
      async * messages () {
        while (subscribed) { // eslint-disable-line no-unmodified-loop-condition
          message = await sh.read()

          if (message == null) {
            throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
          }

          yield PSMessage.decode(message)
        }
      },
      async cancel () {
        subscribed = false
        await sh.close()
      }
    }

    return subscription
  }

  async getSubscribers (topic: string): Promise<PeerId[]> {
    if (typeof topic !== 'string') {
      throw new CodeError('invalid topic received', 'ERR_INVALID_TOPIC')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.LIST_PEERS,
        topic
      }
    })

    const message = await sh.read()

    if (message == null) {
      throw new CodeError('Empty response from remote', 'ERR_EMPTY_RESPONSE')
    }

    const response = Response.decode(message)

    await sh.close()

    if (response.type !== Response.Type.OK) {
      throw new CodeError(response.error?.msg ?? 'Pubsub get subscribers failed', 'ERR_PUBSUB_GET_SUBSCRIBERS_FAILED')
    }

    if (response.pubsub == null || response.pubsub.topics == null) {
      throw new CodeError('Invalid response', 'ERR_PUBSUB_GET_SUBSCRIBERS_FAILED')
    }

    return response.pubsub.peerIDs.map(buf => peerIdFromBytes(buf))
  }
}

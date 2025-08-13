import {
  Request,
  Response,
  PSRequest,
  PSMessage
} from '@libp2p/daemon-protocol'
import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import * as Digest from 'multiformats/hashes/digest'
import { OperationFailedError } from './index.js'
import type { DaemonClient, Subscription } from './index.js'
import type { PeerId } from '@libp2p/interface'

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

    const response = await sh.read(Response)

    await sh.unwrap().closeWrite()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'Pubsub get topics failed')
    }

    if (response.pubsub?.topics == null) {
      throw new OperationFailedError('Invalid response')
    }

    return response.pubsub.topics
  }

  /**
   * Publish data under a topic
   */
  async publish (topic: string, data: Uint8Array): Promise<void> {
    if (typeof topic !== 'string') {
      throw new InvalidParametersError('invalid topic received')
    }

    if (!(data instanceof Uint8Array)) {
      throw new InvalidParametersError('data received is not a Uint8Array')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.PUBLISH,
        topic,
        data
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().closeWrite()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'Pubsub publish failed')
    }
  }

  /**
   * Request to subscribe a certain topic
   */
  async subscribe (topic: string): Promise<Subscription> {
    if (typeof topic !== 'string') {
      throw new InvalidParametersError('invalid topic received')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.SUBSCRIBE,
        topic
      }
    })

    const response = await sh.read(Response)

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'Pubsub publish failed')
    }

    let subscribed = true

    const subscription: Subscription = {
      async * messages () {
        while (subscribed) { // eslint-disable-line no-unmodified-loop-condition
          yield await sh.read(PSMessage)
        }
      },
      async cancel () {
        subscribed = false
        await sh.unwrap().closeWrite()
      }
    }

    return subscription
  }

  async getSubscribers (topic: string): Promise<PeerId[]> {
    if (typeof topic !== 'string') {
      throw new InvalidParametersError('invalid topic received')
    }

    const sh = await this.client.send({
      type: Request.Type.PUBSUB,
      pubsub: {
        type: PSRequest.Type.LIST_PEERS,
        topic
      }
    })

    const response = await sh.read(Response)

    await sh.unwrap().closeWrite()

    if (response.type !== Response.Type.OK) {
      throw new OperationFailedError(response.error?.msg ?? 'Pubsub get subscribers failed')
    }

    if (response.pubsub?.topics == null) {
      throw new OperationFailedError('Invalid response')
    }

    return response.pubsub.peerIDs.map(buf => peerIdFromMultihash(Digest.decode(buf)))
  }
}

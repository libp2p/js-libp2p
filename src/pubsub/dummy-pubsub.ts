import { EventEmitter } from '@libp2p/interfaces/events'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PublishResult, PubSub, PubSubEvents, StrictNoSign, StrictSign, TopicValidatorFn } from '@libp2p/interface-pubsub'
import { CodeError } from '@libp2p/interfaces/errors'
import { messages, codes } from '../errors.js'

export class DummyPubSub extends EventEmitter<PubSubEvents> implements PubSub {
  public topicValidators = new Map<string, TopicValidatorFn>()

  isStarted (): boolean {
    return false
  }

  start (): void | Promise<void> {

  }

  stop (): void | Promise<void> {

  }

  get globalSignaturePolicy (): typeof StrictSign | typeof StrictNoSign {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  get multicodecs (): string[] {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  getPeers (): PeerId[] {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  getTopics (): string[] {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  subscribe (): void {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  unsubscribe (): void {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  getSubscribers (): PeerId[] {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }

  async publish (): Promise<PublishResult> {
    throw new CodeError(messages.PUBSUB_DISABLED, codes.ERR_PUBSUB_DISABLED)
  }
}

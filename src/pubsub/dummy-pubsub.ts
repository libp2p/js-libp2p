import { EventEmitter } from '@libp2p/interfaces/events'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PublishResult, PubSub, PubSubEvents, StrictNoSign, StrictSign } from '@libp2p/interfaces/pubsub'
import errCode from 'err-code'
import { messages, codes } from '../errors.js'

export class DummyPubSub extends EventEmitter<PubSubEvents> implements PubSub {
  isStarted (): boolean {
    return false
  }

  start (): void | Promise<void> {

  }

  stop (): void | Promise<void> {

  }

  get globalSignaturePolicy (): typeof StrictSign | typeof StrictNoSign {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  get multicodecs (): string[] {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  getPeers (): PeerId[] {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  getTopics (): string[] {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  subscribe (): void {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  unsubscribe (): void {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  getSubscribers (): PeerId[] {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }

  async publish (): Promise<PublishResult> {
    throw errCode(new Error(messages.PUBSUB_DISABLED), codes.ERR_PUBSUB_DISABLED)
  }
}

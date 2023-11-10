import type { Message } from '../../message/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'

export interface PingComponents {
  logger: ComponentLogger
}

export class PingHandler implements DHTMessageHandler {
  private readonly log: Logger

  constructor (components: PingComponents) {
    this.log = components.logger.forComponent('libp2p:kad-dht:rpc:handlers:ping')
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    this.log('ping from %p', peerId)
    return msg
  }
}

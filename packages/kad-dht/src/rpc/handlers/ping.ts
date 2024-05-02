import type { Message } from '../../message/dht.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId } from '@libp2p/interface'

export interface PingComponents {
  logger: ComponentLogger
}

export interface PingHandlerInit {
  logPrefix: string
}

export class PingHandler implements DHTMessageHandler {
  private readonly log: Logger

  constructor (components: PingComponents, init: PingHandlerInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:ping`)
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    this.log('ping from %p', peerId)
    return msg
  }
}

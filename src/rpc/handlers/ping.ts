import { logger } from '@libp2p/logger'
import type { Message } from '../../message/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Initializable } from '@libp2p/interfaces/components'

const log = logger('libp2p:kad-dht:rpc:handlers:ping')

export class PingHandler implements DHTMessageHandler, Initializable {
  async handle (peerId: PeerId, msg: Message) {
    log('ping from %p', peerId)
    return msg
  }

  init (): void {

  }
}

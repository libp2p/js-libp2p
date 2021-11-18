import type PeerId from 'peer-id'
import type { Message } from '../message'

export interface DHTMessageHandler {
  handle: (peerId: PeerId, msg: Message) => Promise<Message | undefined>
}

import { CodeError } from '@libp2p/interface'
import { MessageType } from '../../message/dht.js'
import type { PeerInfoMapper } from '../../index.js'
import type { Message } from '../../message/dht.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerInfo } from '@libp2p/interface'

export interface FindNodeHandlerInit {
  peerRouting: PeerRouting
  logPrefix: string
  peerInfoMapper: PeerInfoMapper
}

export interface FindNodeHandlerComponents {
  peerId: PeerId
  logger: ComponentLogger
}

export class FindNodeHandler implements DHTMessageHandler {
  private readonly peerRouting: PeerRouting
  private readonly peerInfoMapper: PeerInfoMapper
  private readonly peerId: PeerId
  private readonly log: Logger

  constructor (components: FindNodeHandlerComponents, init: FindNodeHandlerInit) {
    const { peerRouting, logPrefix } = init

    this.log = components.logger.forComponent(`${logPrefix}:rpc:handlers:find-node`)
    this.peerId = components.peerId
    this.peerRouting = peerRouting
    this.peerInfoMapper = init.peerInfoMapper
  }

  /**
   * Process `FindNode` DHT messages
   */
  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    this.log('incoming request from %p for peers closer to %b', peerId, msg.key)

    if (msg.key == null) {
      throw new CodeError('Invalid FIND_NODE message received - key was missing', 'ERR_INVALID_MESSAGE')
    }

    const closer: PeerInfo[] = await this.peerRouting.getCloserPeersOffline(msg.key, peerId)

    const response: Message = {
      type: MessageType.FIND_NODE,
      clusterLevel: msg.clusterLevel,
      closer: closer
        .map(this.peerInfoMapper)
        .filter(({ multiaddrs }) => multiaddrs.length)
        .filter(({ id }) => !id.equals(this.peerId))
        .map(peerInfo => ({
          id: peerInfo.id.toBytes(),
          multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
        })),
      providers: []
    }

    if (response.closer.length === 0) {
      this.log('could not find any peers closer to %b than %p', msg.key, peerId)
    }

    return response
  }
}

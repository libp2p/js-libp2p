import { CodeError } from '@libp2p/interface'
import { protocols } from '@multiformats/multiaddr'
import { equals as uint8ArrayEquals } from 'uint8arrays'
import { MessageType } from '../../message/dht.js'
import type { PeerInfoMapper } from '../../index.js'
import type { Message } from '../../message/dht.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerInfo } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

export interface FindNodeHandlerInit {
  peerRouting: PeerRouting
  logPrefix: string
  peerInfoMapper: PeerInfoMapper
}

export interface FindNodeHandlerComponents {
  peerId: PeerId
  addressManager: AddressManager
  logger: ComponentLogger
}

export class FindNodeHandler implements DHTMessageHandler {
  private readonly peerRouting: PeerRouting
  private readonly peerInfoMapper: PeerInfoMapper
  private readonly peerId: PeerId
  private readonly addressManager: AddressManager
  private readonly log: Logger

  constructor (components: FindNodeHandlerComponents, init: FindNodeHandlerInit) {
    const { peerRouting, logPrefix } = init

    this.log = components.logger.forComponent(`${logPrefix}:rpc:handlers:find-node`)
    this.peerId = components.peerId
    this.addressManager = components.addressManager
    this.peerRouting = peerRouting
    this.peerInfoMapper = init.peerInfoMapper
  }

  /**
   * Process `FindNode` DHT messages
   */
  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    this.log('incoming request from %p for peers closer to %b', peerId, msg.key)

    let closer: PeerInfo[] = []

    if (msg.key == null) {
      throw new CodeError('Invalid FIND_NODE message received - key was missing', 'ERR_INVALID_MESSAGE')
    }

    if (uint8ArrayEquals(this.peerId.toBytes(), msg.key)) {
      closer = [{
        id: this.peerId,
        multiaddrs: this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      }]
    } else {
      closer = await this.peerRouting.getCloserPeersOffline(msg.key, peerId)
    }

    const response: Message = {
      type: MessageType.FIND_NODE,
      clusterLevel: msg.clusterLevel,
      closer: closer
        .map(this.peerInfoMapper)
        .filter(({ multiaddrs }) => multiaddrs.length)
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

import { protocols } from '@multiformats/multiaddr'
import { equals as uint8ArrayEquals } from 'uint8arrays'
import { Message } from '../../message/index.js'
import {
  removePrivateAddresses,
  removePublicAddresses
} from '../../utils.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerInfo } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

export interface FindNodeHandlerInit {
  peerRouting: PeerRouting
  lan: boolean
}

export interface FindNodeHandlerComponents {
  peerId: PeerId
  addressManager: AddressManager
  logger: ComponentLogger
}

export class FindNodeHandler implements DHTMessageHandler {
  private readonly peerRouting: PeerRouting
  private readonly lan: boolean
  private readonly peerId: PeerId
  private readonly addressManager: AddressManager
  private readonly log: Logger

  constructor (components: FindNodeHandlerComponents, init: FindNodeHandlerInit) {
    const { peerRouting, lan } = init

    this.log = components.logger.forComponent('libp2p:kad-dht:rpc:handlers:find-node')
    this.peerId = components.peerId
    this.addressManager = components.addressManager
    this.peerRouting = peerRouting
    this.lan = Boolean(lan)
  }

  /**
   * Process `FindNode` DHT messages
   */
  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    this.log('incoming request from %p for peers closer to %b', peerId, msg.key)

    let closer: PeerInfo[] = []

    if (uint8ArrayEquals(this.peerId.toBytes(), msg.key)) {
      closer = [{
        id: this.peerId,
        multiaddrs: this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      }]
    } else {
      closer = await this.peerRouting.getCloserPeersOffline(msg.key, peerId)
    }

    closer = closer
      .map(this.lan ? removePublicAddresses : removePrivateAddresses)
      .filter(({ multiaddrs }) => multiaddrs.length)

    const response = new Message(msg.type, new Uint8Array(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      this.log('could not find any peers closer to %b than %p', msg.key, peerId)
    }

    return response
  }
}

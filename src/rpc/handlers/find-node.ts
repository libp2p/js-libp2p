import { Message } from '../../message/index.js'
import { logger } from '@libp2p/logger'
import {
  removePrivateAddresses,
  removePublicAddresses
} from '../../utils.js'
import { equals as uint8ArrayEquals } from 'uint8arrays'
import { Components } from '@libp2p/interfaces/components'
import { protocols } from '@multiformats/multiaddr'
import type { Initializable } from '@libp2p/interfaces/components'
import type { PeerInfo } from '@libp2p/interfaces/peer-info'
import type { DHTMessageHandler } from '../index.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'

const log = logger('libp2p:kad-dht:rpc:handlers:find-node')

export interface FindNodeHandlerInit {
  peerRouting: PeerRouting
  lan: boolean
}

export class FindNodeHandler implements DHTMessageHandler, Initializable {
  private readonly peerRouting: PeerRouting
  private readonly lan: boolean
  private components = new Components()

  constructor (init: FindNodeHandlerInit) {
    const { peerRouting, lan } = init
    this.peerRouting = peerRouting
    this.lan = Boolean(lan)
  }

  init (components: Components): void {
    this.components = components
  }

  /**
   * Process `FindNode` DHT messages
   */
  async handle (peerId: PeerId, msg: Message) {
    log('incoming request from %p for peers closer to %b', peerId, msg.key)

    let closer: PeerInfo[] = []

    if (uint8ArrayEquals(this.components.getPeerId().toBytes(), msg.key)) {
      closer = [{
        id: this.components.getPeerId(),
        multiaddrs: this.components.getAddressManager().getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code)),
        protocols: []
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
      log('could not find any peers closer to %b than %p', msg.key, peerId)
    }

    return response
  }
}

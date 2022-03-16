import { Message } from '../../message/index.js'
import { logger } from '@libp2p/logger'
import {
  removePrivateAddresses,
  removePublicAddresses
} from '../../utils.js'
import { pipe } from 'it-pipe'
import type { DHTMessageHandler } from '../index.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import map from 'it-map'
import filter from 'it-filter'
import all from 'it-all'
import type { Initializable } from '@libp2p/interfaces/components'

const log = logger('libp2p:kad-dht:rpc:handlers:find-node')

export interface FindNodeHandlerInit {
  peerRouting: PeerRouting
  lan: boolean
}

export class FindNodeHandler implements DHTMessageHandler, Initializable {
  private readonly peerRouting: PeerRouting
  private readonly lan: boolean

  constructor (init: FindNodeHandlerInit) {
    const { peerRouting, lan } = init
    this.peerRouting = peerRouting
    this.lan = Boolean(lan)
  }

  init (): void {

  }

  /**
   * Process `FindNode` DHT messages
   */
  async handle (peerId: PeerId, msg: Message) {
    log('incoming request from %p for peers closer to %b', peerId, msg.key)

    const mapper = this.lan ? removePublicAddresses : removePrivateAddresses

    const closer = await pipe(
      await this.peerRouting.getCloserPeersOffline(msg.key, peerId),
      (source) => map(source, mapper),
      (source) => filter(source, ({ multiaddrs }) => multiaddrs.length > 0),
      async (source) => await all(source)
    )

    const response = new Message(msg.type, new Uint8Array(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      log('could not find any peers closer to %b than %p', msg.key, peerId)
    }

    return response
  }
}

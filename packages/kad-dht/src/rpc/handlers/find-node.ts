import { InvalidMessageError } from '@libp2p/interface'
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
    this.log('incoming request from %p for peers close to %b', peerId, msg.key)
    try {
      if (msg.key == null) {
        throw new InvalidMessageError('Invalid FIND_NODE message received - key was missing')
      }

      const closer: PeerInfo[] = await this.peerRouting.getClosestPeersOffline(msg.key, {
        exclude: [
        // never tell a peer about itself
          peerId,

          // do not include the server in the results
          this.peerId
        ]
      })

      if (uint8ArrayEquals(this.peerId.toMultihash().bytes, msg.key)) {
        closer.push({
          id: this.peerId,
          multiaddrs: this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
        })
      }

      const response: Message = {
        type: MessageType.FIND_NODE,
        clusterLevel: msg.clusterLevel,
        closer: closer
          .map(this.peerInfoMapper)
          .filter(({ multiaddrs }) => multiaddrs.length)
          .map(peerInfo => ({
            id: peerInfo.id.toMultihash().bytes,
            multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
          })),
        providers: []
      }

      if (response.closer.length === 0) {
        this.log('could not find any peers closer to %b for %p', msg.key, peerId)
      } else {
        this.log('found %d peers close to %b for %p', response.closer.length, msg.key, peerId)
      }

      return response
    } catch (err: any) {
      this.log('error during finding peers closer to %b for %p - %e', msg.key, peerId, err)
      throw err
    }
  }
}

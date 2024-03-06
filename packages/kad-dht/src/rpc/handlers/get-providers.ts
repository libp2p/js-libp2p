import { CodeError } from '@libp2p/interface'
import { CID } from 'multiformats/cid'
import { MessageType } from '../../message/dht.js'
import type { PeerInfoMapper } from '../../index.js'
import type { Message } from '../../message/dht.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { Providers } from '../../providers.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerInfo, PeerStore } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface GetProvidersHandlerInit {
  peerRouting: PeerRouting
  providers: Providers
  logPrefix: string
  peerInfoMapper: PeerInfoMapper
}

export interface GetProvidersHandlerComponents {
  peerStore: PeerStore
  logger: ComponentLogger
}

export class GetProvidersHandler implements DHTMessageHandler {
  private readonly peerRouting: PeerRouting
  private readonly providers: Providers
  private readonly peerStore: PeerStore
  private readonly peerInfoMapper: PeerInfoMapper
  private readonly log: Logger

  constructor (components: GetProvidersHandlerComponents, init: GetProvidersHandlerInit) {
    const { peerRouting, providers, logPrefix } = init

    this.log = components.logger.forComponent(`${logPrefix}:rpc:handlers:get-providers`)
    this.peerStore = components.peerStore
    this.peerRouting = peerRouting
    this.providers = providers
    this.peerInfoMapper = init.peerInfoMapper
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    if (msg.key == null) {
      throw new CodeError('Invalid FIND_NODE message received - key was missing', 'ERR_INVALID_MESSAGE')
    }

    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw new CodeError('Invalid CID', 'ERR_INVALID_CID')
    }

    this.log('%p asking for providers for %s', peerId, cid)

    const [peers, closer] = await Promise.all([
      this.providers.getProviders(cid),
      this.peerRouting.getCloserPeersOffline(msg.key, peerId)
    ])

    const providerPeers = await this._getPeers(peers)
    const closerPeers = await this._getPeers(closer.map(({ id }) => id))
    const response: Message = {
      type: MessageType.GET_PROVIDERS,
      key: msg.key,
      clusterLevel: msg.clusterLevel,
      closer: closerPeers
        .map(this.peerInfoMapper)
        .filter(({ multiaddrs }) => multiaddrs.length)
        .map(peerInfo => ({
          id: peerInfo.id.toBytes(),
          multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
        })),
      providers: providerPeers
        .map(this.peerInfoMapper)
        .filter(({ multiaddrs }) => multiaddrs.length)
        .map(peerInfo => ({
          id: peerInfo.id.toBytes(),
          multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
        }))
    }

    this.log('got %s providers %s closerPeers', response.providers.length, response.closer.length)

    return response
  }

  async _getAddresses (peerId: PeerId): Promise<Multiaddr[]> {
    return []
  }

  async _getPeers (peerIds: PeerId[]): Promise<PeerInfo[]> {
    const output: PeerInfo[] = []

    for (const peerId of peerIds) {
      try {
        const peer = await this.peerStore.get(peerId)

        const peerAfterFilter = this.peerInfoMapper({
          id: peerId,
          multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
        })

        if (peerAfterFilter.multiaddrs.length > 0) {
          output.push(peerAfterFilter)
        }
      } catch (err: any) {
        if (err.code !== 'ERR_NOT_FOUND') {
          throw err
        }
      }
    }

    return output
  }
}

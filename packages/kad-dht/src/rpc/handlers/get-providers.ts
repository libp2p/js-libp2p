import { InvalidMessageError } from '@libp2p/interface'
import all from 'it-all'
import map from 'it-map'
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
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
}

export class GetProvidersHandler implements DHTMessageHandler {
  private readonly peerId: PeerId
  private readonly peerRouting: PeerRouting
  private readonly providers: Providers
  private readonly peerStore: PeerStore
  private readonly peerInfoMapper: PeerInfoMapper
  private readonly log: Logger

  constructor (components: GetProvidersHandlerComponents, init: GetProvidersHandlerInit) {
    const { peerRouting, providers, logPrefix } = init

    this.log = components.logger.forComponent(`${logPrefix}:rpc:handlers:get-providers`)
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.peerRouting = peerRouting
    this.providers = providers
    this.peerInfoMapper = init.peerInfoMapper
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    if (msg.key == null) {
      throw new InvalidMessageError('Invalid GET_PROVIDERS message received - key was missing')
    }

    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw new InvalidMessageError('Invalid CID')
    }

    this.log('%p asking for providers for %s', peerId, cid)

    const [providerPeers, closerPeers] = await Promise.all([
      all(map(await this.providers.getProviders(cid), async (peerId) => {
        const peer = await this.peerStore.get(peerId)
        const info: PeerInfo = {
          id: peer.id,
          multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
        }

        return info
      })),
      this.peerRouting.getClosestPeersOffline(msg.key)
    ])

    const response: Message = {
      type: MessageType.GET_PROVIDERS,
      key: msg.key,
      clusterLevel: msg.clusterLevel,
      closer: closerPeers
        .map(this.peerInfoMapper)
        .filter(({ id, multiaddrs }) => multiaddrs.length > 0)
        .map(peerInfo => ({
          id: peerInfo.id.toMultihash().bytes,
          multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
        })),
      providers: providerPeers
        .map(this.peerInfoMapper)
        .filter(({ id, multiaddrs }) => multiaddrs.length > 0)
        .map(peerInfo => ({
          id: peerInfo.id.toMultihash().bytes,
          multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
        }))
    }

    this.log('got %s providers %s closerPeers', response.providers.length, response.closer.length)

    return response
  }

  async _getAddresses (peerId: PeerId): Promise<Multiaddr[]> {
    return []
  }
}

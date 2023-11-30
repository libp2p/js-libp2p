import { CodeError } from '@libp2p/interface'
import { CID } from 'multiformats/cid'
import { Message } from '../../message/index.js'
import {
  removePrivateAddresses,
  removePublicAddresses
} from '../../utils.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { Providers } from '../../providers.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerInfo, PeerStore } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface GetProvidersHandlerInit {
  peerRouting: PeerRouting
  providers: Providers
  lan: boolean
}

export interface GetProvidersHandlerComponents {
  peerStore: PeerStore
  logger: ComponentLogger
}

export class GetProvidersHandler implements DHTMessageHandler {
  private readonly peerRouting: PeerRouting
  private readonly providers: Providers
  private readonly lan: boolean
  private readonly peerStore: PeerStore
  private readonly log: Logger

  constructor (components: GetProvidersHandlerComponents, init: GetProvidersHandlerInit) {
    const { peerRouting, providers, lan } = init

    this.log = components.logger.forComponent('libp2p:kad-dht:rpc:handlers:get-providers')
    this.peerStore = components.peerStore
    this.peerRouting = peerRouting
    this.providers = providers
    this.lan = Boolean(lan)
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
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
    const response = new Message(msg.type, msg.key, msg.clusterLevel)

    if (providerPeers.length > 0) {
      response.providerPeers = providerPeers
    }

    if (closerPeers.length > 0) {
      response.closerPeers = closerPeers
    }

    this.log('got %s providers %s closerPeers', providerPeers.length, closerPeers.length)
    return response
  }

  async _getAddresses (peerId: PeerId): Promise<Multiaddr[]> {
    return []
  }

  async _getPeers (peerIds: PeerId[]): Promise<PeerInfo[]> {
    const output: PeerInfo[] = []
    const addrFilter = this.lan ? removePublicAddresses : removePrivateAddresses

    for (const peerId of peerIds) {
      try {
        const peer = await this.peerStore.get(peerId)

        const peerAfterFilter = addrFilter({
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

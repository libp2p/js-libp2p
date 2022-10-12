import { CID } from 'multiformats/cid'
import errcode from 'err-code'
import { Message } from '../../message/index.js'
import {
  removePrivateAddresses,
  removePublicAddresses
} from '../../utils.js'
import { logger } from '@libp2p/logger'
import type { DHTMessageHandler } from '../index.js'
import type { Providers } from '../../providers.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:kad-dht:rpc:handlers:get-providers')

export interface GetProvidersHandlerInit {
  peerRouting: PeerRouting
  providers: Providers
  lan: boolean
}

export interface GetProvidersHandlerComponents {
  peerStore: PeerStore
}

export class GetProvidersHandler implements DHTMessageHandler {
  private readonly components: GetProvidersHandlerComponents
  private readonly peerRouting: PeerRouting
  private readonly providers: Providers
  private readonly lan: boolean

  constructor (components: GetProvidersHandlerComponents, init: GetProvidersHandlerInit) {
    const { peerRouting, providers, lan } = init

    this.components = components
    this.peerRouting = peerRouting
    this.providers = providers
    this.lan = Boolean(lan)
  }

  async handle (peerId: PeerId, msg: Message) {
    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw errcode(new Error('Invalid CID'), 'ERR_INVALID_CID')
    }

    log('%p asking for providers for %s', peerId, cid)

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

    log('got %s providers %s closerPeers', providerPeers.length, closerPeers.length)
    return response
  }

  async _getAddresses (peerId: PeerId) {
    const addrs = await this.components.peerStore.addressBook.get(peerId)

    return addrs.map(address => address.multiaddr)
  }

  async _getPeers (peerIds: PeerId[]) {
    const output: PeerInfo[] = []
    const addrFilter = this.lan ? removePublicAddresses : removePrivateAddresses

    for (const peerId of peerIds) {
      const peer = addrFilter({
        id: peerId,
        multiaddrs: await this._getAddresses(peerId),
        protocols: []
      })

      if (peer.multiaddrs.length > 0) {
        output.push(peer)
      }
    }

    return output
  }
}

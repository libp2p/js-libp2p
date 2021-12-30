'use strict'

const { CID } = require('multiformats/cid')
const errcode = require('err-code')
const { Message } = require('../../message')
const utils = require('../../utils')
const log = utils.logger('libp2p:kad-dht:rpc:handlers:get-providers')
const {
  removePrivateAddresses,
  removePublicAddresses
} = require('../../utils')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 * @typedef {import('../../types').PeerData} PeerData
 */

/**
 * @implements {DHTMessageHandler}
 */
class GetProvidersHandler {
  /**
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {import('../../peer-routing').PeerRouting} params.peerRouting
   * @param {import('../../providers').Providers} params.providers
   * @param {import('libp2p/src/peer-store/types').PeerStore} params.peerStore
   * @param {import('../../types').Addressable} params.addressable
   * @param {boolean} [params.lan]
   */
  constructor ({ peerId, peerRouting, providers, peerStore, addressable, lan }) {
    this._peerId = peerId
    this._peerRouting = peerRouting
    this._providers = providers
    this._peerStore = peerStore
    this._addressable = addressable
    this._lan = Boolean(lan)
  }

  /**
   * Process `GetProviders` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (/** @type {any} */ err) {
      throw errcode(new Error(`Invalid CID: ${err.message}`), 'ERR_INVALID_CID')
    }

    log('%p asking for providers for %s', peerId, cid)

    const [peers, closer] = await Promise.all([
      this._providers.getProviders(cid),
      this._peerRouting.getCloserPeersOffline(msg.key, peerId)
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

  /**
   * @param {PeerId} peerId
   */
  async _getAddresses (peerId) {
    return this._peerId.equals(peerId) ? this._addressable.multiaddrs : (await (this._peerStore.addressBook.get(peerId)) || []).map(address => address.multiaddr)
  }

  /**
   * @param {PeerId[]} peerIds
   */
  async _getPeers (peerIds) {
    /** @type {PeerData[]} */
    const output = []
    const addrFilter = this._lan ? removePublicAddresses : removePrivateAddresses

    for (const peerId of peerIds) {
      const peer = addrFilter({
        id: peerId,
        multiaddrs: await this._getAddresses(peerId)
      })

      if (peer.multiaddrs.length) {
        output.push(peer)
      }
    }

    return output
  }
}

module.exports.GetProvidersHandler = GetProvidersHandler

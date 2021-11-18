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
   * @param {import('interface-datastore').Datastore} params.datastore
   * @param {import('../../types').PeerStore} params.peerStore
   * @param {import('../../types').Addressable} params.addressable
   * @param {boolean} [params.lan]
   */
  constructor ({ peerId, peerRouting, providers, datastore, peerStore, addressable, lan }) {
    this._peerId = peerId
    this._peerRouting = peerRouting
    this._providers = providers
    this._datastore = datastore
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

    log('%p asking for providers for %s', peerId, cid.toString())
    const dsKey = utils.bufferToKey(cid.bytes)

    const [has, peers, closer] = await Promise.all([
      this._datastore.has(dsKey),
      this._providers.getProviders(cid),
      this._peerRouting.getCloserPeersOffline(msg.key, peerId)
    ])

    const providerPeers = peers
      .map((provider) => ({
        id: provider,
        multiaddrs: (this._peerStore.addressBook.get(provider) || []).map(address => address.multiaddr)
      }))
      .map(this._lan ? removePublicAddresses : removePrivateAddresses)
      .filter(({ multiaddrs }) => multiaddrs.length)

    const closerPeers = closer
      .map((closer) => ({
        id: closer.id,
        multiaddrs: (this._peerStore.addressBook.get(closer.id) || []).map(address => address.multiaddr)
      }))
      .map(this._lan ? removePublicAddresses : removePrivateAddresses)
      .filter(({ multiaddrs }) => multiaddrs.length)

    if (has) {
      const mapper = this._lan ? removePublicAddresses : removePrivateAddresses

      const ourRecord = mapper({
        id: this._peerId,
        multiaddrs: this._addressable.multiaddrs
      })

      if (ourRecord.multiaddrs.length) {
        providerPeers.push(ourRecord)
      }
    }

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
}

module.exports.GetProvidersHandler = GetProvidersHandler

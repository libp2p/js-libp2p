'use strict'

const { CID } = require('multiformats/cid')
const errcode = require('err-code')
const utils = require('../../utils')
const log = utils.logger('libp2p:kad-dht:rpc:handlers:add-provider')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message').Message} Message
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 */

/**
 * @implements {DHTMessageHandler}
 */
class AddProviderHandler {
  /**
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {import('../../providers').Providers} params.providers
   * @param {import('../../types').PeerStore} params.peerStore
   */
  constructor ({ peerId, providers, peerStore }) {
    this._peerId = peerId
    this._providers = providers
    this._peerStore = peerStore
  }

  /**
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    log('start')

    if (!msg.key || msg.key.length === 0) {
      throw errcode(new Error('Missing key'), 'ERR_MISSING_KEY')
    }

    /** @type {CID} */
    let cid
    try {
      // this is actually just the multihash, not the whole CID
      cid = CID.decode(msg.key)
    } catch (/** @type {any} */ err) {
      const errMsg = `Invalid CID: ${err.message}`
      throw errcode(new Error(errMsg), 'ERR_INVALID_CID')
    }

    if (!msg.providerPeers || !msg.providerPeers.length) {
      log.error('no providers found in message')
    }

    await Promise.all(
      msg.providerPeers.map(async (pi) => {
        // Ignore providers not from the originator
        if (!pi.id.equals(peerId)) {
          log('invalid provider peer %p from %p', pi.id, peerId)
          return
        }

        if (pi.multiaddrs.length < 1) {
          log('no valid addresses for provider %p. Ignore', peerId)
          return
        }

        log('received provider %p for %s (addrs %s)', peerId, cid, pi.multiaddrs.map((m) => m.toString()))

        if (!this._peerId.equals(pi.id)) {
          // Add known address to peer store
          this._peerStore.addressBook.add(pi.id, pi.multiaddrs)
          await this._providers.addProvider(cid, pi.id)
        }
      })
    )

    // typescript requires a return value
    return undefined
  }
}

module.exports.AddProviderHandler = AddProviderHandler

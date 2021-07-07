'use strict'

const { CID } = require('multiformats/cid')
const errcode = require('err-code')

const utils = require('../../utils')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message')} Message
 */

/**
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:add-provider')
  /**
   * Process `AddProvider` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async function addProvider (peerId, msg) { // eslint-disable-line require-await
    log('start')

    if (!msg.key || msg.key.length === 0) {
      throw errcode(new Error('Missing key'), 'ERR_MISSING_KEY')
    }

    /** @type {CID} */
    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (err) {
      const errMsg = `Invalid CID: ${err.message}`
      throw errcode(new Error(errMsg), 'ERR_INVALID_CID')
    }

    msg.providerPeers.forEach((pi) => {
      // Ignore providers not from the originator
      if (!pi.id.isEqual(peerId)) {
        log('invalid provider peer %s from %s', pi.id.toB58String(), peerId.toB58String())
        return
      }

      if (pi.multiaddrs.length < 1) {
        log('no valid addresses for provider %s. Ignore', peerId.toB58String())
        return
      }

      log('received provider %s for %s (addrs %s)', peerId.toB58String(), cid.toString(), pi.multiaddrs.map((m) => m.toString()))

      if (!dht._isSelf(pi.id)) {
        // Add known address to peer store
        dht.peerStore.addressBook.add(pi.id, pi.multiaddrs)
        return dht.providers.addProvider(cid, pi.id)
      }
    })

    // Previous versions of the JS DHT sent erroneous providers in the
    // `providerPeers` field. In order to accommodate older clients that have
    // this bug, we fall back to assuming the originator is the provider if
    // we can't find any valid providers in the payload.
    // https://github.com/libp2p/js-libp2p-kad-dht/pull/127
    // https://github.com/libp2p/js-libp2p-kad-dht/issues/128
    return dht.providers.addProvider(cid, peerId)
  }

  return addProvider
}

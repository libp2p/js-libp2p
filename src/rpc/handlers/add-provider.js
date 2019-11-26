'use strict'

const CID = require('cids')
const errcode = require('err-code')

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:add-provider')
  /**
   * Process `AddProvider` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<void>}
   */
  return async function addProvider (peer, msg) { // eslint-disable-line require-await
    log('start')

    if (!msg.key || msg.key.length === 0) {
      throw errcode(new Error('Missing key'), 'ERR_MISSING_KEY')
    }

    let cid
    try {
      cid = new CID(msg.key)
    } catch (err) {
      const errMsg = `Invalid CID: ${err.message}`
      throw errcode(new Error(errMsg), 'ERR_INVALID_CID')
    }

    msg.providerPeers.forEach((pi) => {
      // Ignore providers not from the originator
      if (!pi.id.isEqual(peer.id)) {
        log('invalid provider peer %s from %s', pi.id.toB58String(), peer.id.toB58String())
        return
      }

      if (pi.multiaddrs.size < 1) {
        log('no valid addresses for provider %s. Ignore', peer.id.toB58String())
        return
      }

      log('received provider %s for %s (addrs %s)', peer.id.toB58String(), cid.toBaseEncodedString(), pi.multiaddrs.toArray().map((m) => m.toString()))

      if (!dht._isSelf(pi.id)) {
        dht.peerStore.put(pi)
        return dht.providers.addProvider(cid, pi.id)
      }
    })

    // Previous versions of the JS DHT sent erroneous providers in the
    // `providerPeers` field. In order to accommodate older clients that have
    // this bug, we fall back to assuming the originator is the provider if
    // we can't find any valid providers in the payload.
    // https://github.com/libp2p/js-libp2p-kad-dht/pull/127
    // https://github.com/libp2p/js-libp2p-kad-dht/issues/128
    return dht.providers.addProvider(cid, peer.id)
  }
}

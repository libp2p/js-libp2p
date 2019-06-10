'use strict'

const CID = require('cids')
const errcode = require('err-code')
const promiseToCallback = require('promise-to-callback')

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:add-provider')
  /**
   * Process `AddProvider` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  return function addProvider (peer, msg, callback) {
    log('start')

    if (!msg.key || msg.key.length === 0) {
      return callback(errcode(new Error('Missing key'), 'ERR_MISSING_KEY'))
    }

    let cid
    try {
      cid = new CID(msg.key)
    } catch (err) {
      const errMsg = `Invalid CID: ${err.message}`

      return callback(errcode(new Error(errMsg), 'ERR_INVALID_CID'))
    }

    let foundProvider = false
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
        foundProvider = true
        dht.peerBook.put(pi)
        promiseToCallback(dht.providers.addProvider(cid, pi.id))(err => callback(err))
      }
    })

    // Previous versions of the JS DHT sent erroneous providers in the
    // `providerPeers` field. In order to accommodate older clients that have
    // this bug, we fall back to assuming the originator is the provider if
    // we can't find any valid providers in the payload.
    // https://github.com/libp2p/js-libp2p-kad-dht/pull/127
    // https://github.com/libp2p/js-libp2p-kad-dht/issues/128
    if (!foundProvider) {
      promiseToCallback(dht.providers.addProvider(cid, peer.id))(err => callback(err))
    }
  }
}

'use strict'

const CID = require('cids')

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:add-provider')
  /**
   * Process `AddProvider` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function addProvider (peer, msg, callback) {
    log('start')

    if (!msg.key || msg.key.length === 0) {
      return callback(new Error('Missing key'))
    }

    let cid
    try {
      cid = new CID(msg.key)
    } catch (err) {
      return callback(new Error('Invalid CID: ' + err.message))
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
        dht.peerBook.put(pi)
      }
    })

    dht.providers.addProvider(cid, peer.id, callback)
  }
}

'use strict'

const CID = require('cids')
const parallel = require('async/parallel')
const PeerInfo = require('peer-info')

const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:get-providers')

  /**
   * Process `GetProviders` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function getProviders (peer, msg, callback) {
    let cid
    try {
      cid = new CID(msg.key)
    } catch (err) {
      return callback(new Error('Invalid CID: ' + err.message))
    }

    log('%s', cid.toBaseEncodedString())

    const dsKey = utils.bufferToKey(cid.buffer)

    parallel([
      (cb) => dht.datastore.has(dsKey, (err, exists) => {
        if (err) {
          log.error('Failed to check datastore existence', err)
          return cb(null, false)
        }

        cb(null, exists)
      }),
      (cb) => dht.providers.getProviders(cid, cb),
      (cb) => dht._betterPeersToQuery(msg, peer, cb)
    ], (err, res) => {
      if (err) {
        return callback(err)
      }
      const has = res[0]
      const closer = res[2]
      const providers = res[1].map((p) => {
        if (dht.peerBook.has(p)) {
          return dht.peerBook.get(p)
        }

        return dht.peerBook.put(new PeerInfo(p))
      })

      if (has) {
        providers.push(dht.peerInfo)
      }

      const response = new Message(msg.type, msg.key, msg.clusterLevel)

      if (providers.length > 0) {
        response.providerPeers = providers
      }

      if (closer.length > 0) {
        response.closerPeers = closer
      }

      log('got %s providers %s closerPeers', providers.length, closer.length)

      callback(null, response)
    })
  }
}

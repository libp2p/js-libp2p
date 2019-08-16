'use strict'

const CID = require('cids')
const PeerInfo = require('peer-info')
const promiseToCallback = require('promise-to-callback')
const errcode = require('err-code')

const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:get-providers')

  /**
   * Process `GetProviders` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<Message>} Resolves a `Message` response
   */
  async function getProvidersAsync (peer, msg) {
    let cid
    try {
      cid = new CID(msg.key)
    } catch (err) {
      throw errcode(new Error(`Invalid CID: ${err.message}`), 'ERR_INVALID_CID')
    }

    log('%s', cid.toBaseEncodedString())
    const dsKey = utils.bufferToKey(cid.buffer)

    const [has, peers, closer] = await Promise.all([
      dht.datastore.has(dsKey),
      dht.providers.getProviders(cid),
      dht._betterPeersToQueryAsync(msg, peer)
    ])

    const providers = peers.map((p) => {
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
    return response
  }

  /**
   * Process `GetProviders` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function getProviders (peer, msg, callback) {
    promiseToCallback(getProvidersAsync(peer, msg))(callback)
  }
}

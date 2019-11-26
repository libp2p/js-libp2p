'use strict'

const CID = require('cids')
const PeerInfo = require('peer-info')
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
   * @returns {Promise<Message>}
   */
  return async function getProviders (peer, msg) {
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
      dht._betterPeersToQuery(msg, peer)
    ])

    const providers = peers.map((p) => {
      if (dht.peerStore.has(p)) {
        return dht.peerStore.get(p)
      }

      return dht.peerStore.put(new PeerInfo(p))
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
}

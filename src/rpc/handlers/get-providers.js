'use strict'

const { CID } = require('multiformats/cid')
const errcode = require('err-code')

const Message = require('../../message')
const utils = require('../../utils')

/**
 * @typedef {import('peer-id')} PeerId
 */

/**
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:get-providers')

  /**
   * Process `GetProviders` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async function getProviders (peerId, msg) {
    let cid
    try {
      cid = CID.decode(msg.key)
    } catch (err) {
      throw errcode(new Error(`Invalid CID: ${err.message}`), 'ERR_INVALID_CID')
    }

    log('%s', cid.toString())
    const dsKey = utils.bufferToKey(cid.bytes)

    const [has, peers, closer] = await Promise.all([
      dht.datastore.has(dsKey),
      dht.providers.getProviders(cid),
      dht._betterPeersToQuery(msg, peerId)
    ])

    const providerPeers = peers.map((peerId) => ({
      id: peerId,
      multiaddrs: []
    }))
    const closerPeers = closer.map((c) => ({
      id: c.id,
      multiaddrs: []
    }))

    if (has) {
      providerPeers.push({
        id: dht.peerId,
        multiaddrs: []
      })
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

  return getProviders
}

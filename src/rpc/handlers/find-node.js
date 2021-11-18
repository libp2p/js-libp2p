'use strict'

const { Message } = require('../../message')
const utils = require('../../utils')
const log = utils.logger('libp2p:kad-dht:rpc:handlers:find-node')
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
class FindNodeHandler {
  /**
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {import('../../types').Addressable} params.addressable
   * @param {import('../../peer-routing').PeerRouting} params.peerRouting
   * @param {boolean} [params.lan]
   */
  constructor ({ peerId, addressable, peerRouting, lan }) {
    this._peerId = peerId
    this._addressable = addressable
    this._peerRouting = peerRouting
    this._lan = Boolean(lan)
  }

  /**
   * Process `FindNode` DHT messages
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    log('incoming request from %p for peers closer to %b', peerId, msg.key)

    let closer
    if (this._peerId.equals(msg.key)) {
      closer = [{
        id: this._peerId,
        multiaddrs: this._addressable.multiaddrs
      }]
    } else {
      closer = await this._peerRouting.getCloserPeersOffline(msg.key, peerId)
    }

    closer = closer
      .map(this._lan ? removePublicAddresses : removePrivateAddresses)
      .filter(({ multiaddrs }) => multiaddrs.length)

    const response = new Message(msg.type, new Uint8Array(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      log('could not find any peers closer to %p', peerId)
    }

    return response
  }
}

module.exports.FindNodeHandler = FindNodeHandler

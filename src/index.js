'use strict'

const debugName = 'libp2p:floodsub'

// @ts-ignore time-cache does not export types
const TimeCache = require('time-cache')
const { toString } = require('uint8arrays/to-string')
const BaseProtocol = require('libp2p-interfaces/src/pubsub')
const { utils } = require('libp2p-interfaces/src/pubsub')

const { multicodec } = require('./config')

/**
 * @typedef {import('libp2p-interfaces/src/pubsub').InMessage} InMessage
 */

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
class FloodSub extends BaseProtocol {
  /**
   * @param {import('libp2p')} libp2p - instance of libp2p
   * @param {Object} [options]
   * @param {boolean} [options.emitSelf] - if publish should emit to self, if subscribed, defaults to false
   * @class
   */
  constructor (libp2p, options = {}) {
    super({
      debugName: debugName,
      multicodecs: multicodec,
      libp2p,
      canRelayMessage: true,
      ...options
    })

    /**
     * Cache of seen messages
     *
     * @type {TimeCache}
     */
    this.seenCache = new TimeCache()
  }

  /**
   * Process incoming message
   * Extends base implementation to check router cache.
   *
   * @override
   * @param {InMessage} message - The message to process
   * @returns {Promise<void>}
   */
  async _processRpcMessage (message) {
    // Check if I've seen the message, if yes, ignore
    const seqno = await this.getMsgId(message)
    const msgIdStr = toString(seqno, 'base64')

    if (this.seenCache.has(msgIdStr)) {
      return
    }
    this.seenCache.put(msgIdStr)

    await super._processRpcMessage(message)
  }

  /**
   * Publish message created. Forward it to the peers.
   *
   * @override
   * @param {InMessage} message
   * @returns {Promise<void>}
   */
  _publish (message) {
    this._forwardMessage(message)
    return Promise.resolve()
  }

  /**
   * Forward message to peers.
   *
   * @param {InMessage} message
   * @returns {void}
   */
  _forwardMessage (message) {
    message.topicIDs.forEach((topic) => {
      const peers = this.topics.get(topic)
      if (!peers) {
        return
      }
      peers.forEach((id) => {
        this.log('publish msgs on topics', message.topicIDs, id)
        if (id !== this.peerId.toB58String() && id !== message.receivedFrom) {
          this._sendRpc(id, { msgs: [utils.normalizeOutRpcMessage(message)] })
        }
      })
    })
  }
}

module.exports = FloodSub
module.exports.multicodec = multicodec

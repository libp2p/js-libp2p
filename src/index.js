'use strict'

const debugName = 'libp2p:floodsub'

const TimeCache = require('time-cache')
const BaseProtocol = require('libp2p-interfaces/src/pubsub')
const { utils } = require('libp2p-interfaces/src/pubsub')

const { multicodec } = require('./config')

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
class FloodSub extends BaseProtocol {
  /**
   * @param {Libp2p} libp2p instance of libp2p
   * @param {Object} [options]
   * @param {boolean} options.emitSelf if publish should emit to self, if subscribed, defaults to false
   * @constructor
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
   * @override
   * @param {InMessage} message The message to process
   * @returns {Promise<void>}
   */
  async _processRpcMessage (message) {
    // Check if I've seen the message, if yes, ignore
    const seqno = this.getMsgId(message)
    if (this.seenCache.has(seqno)) {
      return
    }
    this.seenCache.put(seqno)

    await super._processRpcMessage(message)
  }

  /**
   * Publish message created. Forward it to the peers.
   * @override
   * @param {InMessage} message
   * @returns {void}
   */
  _publish (message) {
    this._forwardMessage(message)
  }

  /**
   * Forward message to peers.
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
        if (id !== this.peerId.toB58String()) {
          this._sendRpc(id, { msgs: [utils.normalizeOutRpcMessage(message)] })
        }
      })
    })
  }
}

module.exports = FloodSub
module.exports.multicodec = multicodec

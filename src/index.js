'use strict'

const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const assert = require('assert')

const BaseProtocol = require('libp2p-pubsub')
const { message, utils } = require('libp2p-pubsub')
const config = require('./config')

const multicodec = config.multicodec
const ensureArray = utils.ensureArray
const setImmediate = require('async/setImmediate')
const asyncMap = require('async/map')
const noop = () => {}

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
class FloodSub extends BaseProtocol {
  /**
   * @param {Object} libp2p an instance of Libp2p
   * @param {Object} [options]
   * @param {boolean} options.emitSelf if publish should emit to self, if subscribed, defaults to false
   * @constructor
   */
  constructor (libp2p, options = {}) {
    super('libp2p:floodsub', multicodec, libp2p, options)

    /**
     * List of our subscriptions
     * @type {Set<string>}
     */
    this.subscriptions = new Set()

    /**
     * Pubsub options
     */
    this._options = {
      emitSelf: false,
      ...options
    }
  }

  /**
   * Dial a received peer.
   * @override
   * @param {PeerInfo} peerInfo peer info
   * @param {Connection} conn connection to the peer
   * @param {function} callback
   */
  _onDial (peerInfo, conn, callback) {
    super._onDial(peerInfo, conn, (err) => {
      if (err) return callback(err)
      const idB58Str = peerInfo.id.toB58String()
      const peer = this.peers.get(idB58Str)
      if (peer && peer.isWritable) {
        // Immediately send my own subscriptions to the newly established conn
        peer.sendSubscriptions(this.subscriptions)
      }
      setImmediate(() => callback())
    })
  }

  /**
   * Overriding the implementation of _processConnection should keep the connection and is
   * responsible for processing each RPC message received by other peers.
   * @override
   * @param {string} idB58Str peer id string in base58
   * @param {Connection} conn connection
   * @param {PeerInfo} peer peer info
   * @returns {undefined}
   *
   */
  _processConnection (idB58Str, conn, peer) {
    pull(
      conn,
      lp.decode(),
      pull.map((data) => message.rpc.RPC.decode(data)),
      pull.drain(
        (rpc) => this._onRpc(idB58Str, rpc),
        (err) => this._onConnectionEnd(idB58Str, peer, err)
      )
    )
  }

  /**
   * Called for each RPC call received from the given peer
   * @private
   * @param {string} idB58Str b58 string PeerId of the connected peer
   * @param {rpc.RPC} rpc The pubsub RPC message
   */
  _onRpc (idB58Str, rpc) {
    if (!rpc) {
      return
    }

    this.log('rpc from', idB58Str)
    const subs = rpc.subscriptions
    const msgs = rpc.msgs

    if (msgs && msgs.length) {
      rpc.msgs.forEach((msg) => this._processRpcMessage(msg))
    }

    if (subs && subs.length) {
      const peer = this.peers.get(idB58Str)
      if (peer) {
        peer.updateSubscriptions(subs)
        this.emit('floodsub:subscription-change', peer.info, peer.topics, subs)
      }
    }
  }

  /**
   * @private
   * @param {rpc.RPC.Message} message The message to process
   * @returns {void}
   */
  _processRpcMessage (message) {
    const msg = utils.normalizeInRpcMessage(message)
    const seqno = utils.msgId(msg.from, msg.seqno)
    // 1. check if I've seen the message, if yes, ignore
    if (this.seenCache.has(seqno)) {
      return
    }

    this.seenCache.put(seqno)
    // 2. validate the message (signature verification)
    this.validate(message, (err, isValid) => {
      if (err || !isValid) {
        this.log('Message could not be validated, dropping it. isValid=%s', isValid, err)
        return
      }

      // 3. if message is valid, emit to self
      this._emitMessages(msg.topicIDs, [msg])

      // 4. if message is valid, propagate msg to others
      this._forwardMessages(msg.topicIDs, [msg])
    })
  }

  _emitMessages (topics, messages) {
    topics.forEach((topic) => {
      if (!this.subscriptions.has(topic)) {
        return
      }

      messages.forEach((message) => {
        this.emit(topic, message)
      })
    })
  }

  _forwardMessages (topics, messages) {
    this.peers.forEach((peer) => {
      if (!peer.isWritable || !utils.anyMatch(peer.topics, topics)) {
        return
      }

      peer.sendMessages(utils.normalizeOutRpcMessages(messages))

      this.log('publish msgs on topics', topics, peer.info.id.toB58String())
    })
  }

  /**
   * Unmounts the floodsub protocol and shuts down every connection
   * @override
   * @param {Function} callback
   * @returns {undefined}
   *
   */
  stop (callback) {
    super.stop((err) => {
      if (err) return callback(err)
      this.subscriptions = new Set()
      callback()
    })
  }

  /**
   * Publish messages to the given topics.
   * @override
   * @param {Array<string>|string} topics
   * @param {Array<any>|any} messages
   * @param {function(Error)} callback
   * @returns {undefined}
   *
   */
  publish (topics, messages, callback) {
    assert(this.started, 'FloodSub is not started')
    callback = callback || noop

    this.log('publish', topics, messages)

    topics = ensureArray(topics)
    messages = ensureArray(messages)

    const from = this.libp2p.peerInfo.id.toB58String()

    const buildMessage = (msg, cb) => {
      const seqno = utils.randomSeqno()
      this.seenCache.put(utils.msgId(from, seqno))

      const message = {
        from: from,
        data: msg,
        seqno: seqno,
        topicIDs: topics
      }

      // Emit to self if I'm interested and it is enabled
      this._options.emitSelf && this._emitMessages(topics, [message])

      this._buildMessage(message, cb)
    }

    asyncMap(messages, buildMessage, (err, msgObjects) => {
      if (err) return callback(err)

      // send to all the other peers
      this._forwardMessages(topics, msgObjects)

      callback(null)
    })
  }

  /**
   * Subscribe to the given topic(s).
   * @override
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  subscribe (topics) {
    assert(this.started, 'FloodSub is not started')

    topics = ensureArray(topics)

    topics.forEach((topic) => this.subscriptions.add(topic))

    this.peers.forEach((peer) => sendSubscriptionsOnceReady(peer))
    // make sure that FloodSub is already mounted
    function sendSubscriptionsOnceReady (peer) {
      if (peer && peer.isWritable) {
        return peer.sendSubscriptions(topics)
      }
      const onConnection = () => {
        peer.removeListener('connection', onConnection)
        sendSubscriptionsOnceReady(peer)
      }
      peer.on('connection', onConnection)
      peer.once('close', () => peer.removeListener('connection', onConnection))
    }
  }

  /**
   * Unsubscribe from the given topic(s).
   * @override
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  unsubscribe (topics) {
    // Avoid race conditions, by quietly ignoring unsub when shutdown.
    if (!this.started) {
      return
    }

    topics = ensureArray(topics)

    topics.forEach((topic) => this.subscriptions.delete(topic))

    this.peers.forEach((peer) => checkIfReady(peer))
    // make sure that FloodSub is already mounted
    function checkIfReady (peer) {
      if (peer && peer.isWritable) {
        peer.sendUnsubscriptions(topics)
      } else {
        setImmediate(checkIfReady.bind(peer))
      }
    }
  }
}

module.exports = FloodSub
module.exports.multicodec = multicodec

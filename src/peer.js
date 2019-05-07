'use strict'

const lp = require('pull-length-prefixed')
const Pushable = require('pull-pushable')
const pull = require('pull-stream')
const setImmediate = require('async/setImmediate')
const EventEmitter = require('events')

const { RPC } = require('./message')

/**
 * The known state of a connected peer.
 */
class Peer extends EventEmitter {
  /**
   * @param {PeerInfo} info
   */
  constructor (info) {
    super()

    /**
     * @type {PeerInfo}
     */
    this.info = info
    /**
     * @type {Connection}
     */
    this.conn = null
    /**
     * @type {Set}
     */
    this.topics = new Set()
    /**
     * @type {Pushable}
     */
    this.stream = null

    this._references = 0
  }

  /**
   * Is the peer connected currently?
   *
   * @type {boolean}
   */
  get isConnected () {
    return Boolean(this.conn)
  }

  /**
   * Do we have a connection to write on?
   *
   * @type {boolean}
   */
  get isWritable () {
    return Boolean(this.stream)
  }

  /**
   * Send a message to this peer.
   * Throws if there is no `stream` to write to available.
   *
   * @param {Buffer} msg
   * @returns {undefined}
   */
  write (msg) {
    if (!this.isWritable) {
      const id = this.info.id.toB58String()
      throw new Error('No writable connection to ' + id)
    }

    this.stream.push(msg)
  }

  /**
   * Attach the peer to a connection and setup a write stream
   *
   * @param {Connection} conn
   * @returns {undefined}
   */
  attachConnection (conn) {
    this.conn = conn
    this.stream = new Pushable()

    pull(
      this.stream,
      lp.encode(),
      conn,
      pull.onEnd(() => {
        this.conn = null
        this.stream = null
        this.emit('close')
      })
    )

    this.emit('connection')
  }

  _sendRawSubscriptions (topics, subscribe) {
    if (topics.size === 0) {
      return
    }

    const subs = []
    topics.forEach((topic) => {
      subs.push({
        subscribe: subscribe,
        topicID: topic
      })
    })

    this.write(RPC.encode({
      subscriptions: subs
    }))
  }

  /**
   * Send the given subscriptions to this peer.
   * @param {Set|Array} topics
   * @returns {undefined}
   */
  sendSubscriptions (topics) {
    this._sendRawSubscriptions(topics, true)
  }

  /**
   * Send the given unsubscriptions to this peer.
   * @param {Set|Array} topics
   * @returns {undefined}
   */
  sendUnsubscriptions (topics) {
    this._sendRawSubscriptions(topics, false)
  }

  /**
   * Send messages to this peer.
   *
   * @param {Array<any>} msgs
   * @returns {undefined}
   */
  sendMessages (msgs) {
    this.write(RPC.encode({
      msgs: msgs
    }))
  }

  /**
   * Bulk process subscription updates.
   *
   * @param {Array} changes
   * @returns {undefined}
   */
  updateSubscriptions (changes) {
    changes.forEach((subopt) => {
      if (subopt.subscribe) {
        this.topics.add(subopt.topicID)
      } else {
        this.topics.delete(subopt.topicID)
      }
    })
  }

  /**
   * Closes the open connection to peer
   *
   * @param {Function} callback
   * @returns {undefined}
   */
  close (callback) {
    // Force removal of peer
    this._references = 1

    // End the pushable
    if (this.stream) {
      this.stream.end()
    }

    setImmediate(() => {
      this.conn = null
      this.stream = null
      this.emit('close')
      callback()
    })
  }
}

module.exports = Peer

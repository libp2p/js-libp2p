'use strict'

const EventEmitter = require('events')
const TimeCache = require('time-cache')
const values = require('lodash.values')
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const assert = require('assert')
const asyncEach = require('async/each')

const Peer = require('./peer')
const utils = require('./utils')
const pb = require('./message')
const config = require('./config')
const Buffer = require('safe-buffer').Buffer

const log = config.log
const multicodec = config.multicodec
const ensureArray = utils.ensureArray
const setImmediate = require('async/setImmediate')

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
class FloodSub extends EventEmitter {
  /**
   * @param {Object} libp2p
   * @returns {FloodSub}
   */
  constructor (libp2p) {
    super()

    this.libp2p = libp2p
    this.started = false

    /**
     * Time based cache for sequence numbers.
     *
     * @type {TimeCache}
     */
    this.cache = new TimeCache()

    /**
     * Map of peers.
     *
     * @type {Map<string, Peer>}
     */
    this.peers = new Map()

    /**
     * List of our subscriptions
     * @type {Set<string>}
     */
    this.subscriptions = new Set()

    this._onConnection = this._onConnection.bind(this)
    this._dialPeer = this._dialPeer.bind(this)
  }

  _dialPeer (peerInfo, callback) {
    callback = callback || function noop () {}
    const idB58Str = peerInfo.id.toB58String()
    log('dialing %s', idB58Str)

    // If already have a PubSub conn, ignore
    const peer = this.peers.get(idB58Str)
    if (peer && peer.isConnected) {
      return
    }

    this.libp2p.dial(peerInfo, multicodec, (err, conn) => {
      if (err) {
        return log.err(err)
      }

      this._onDial(peerInfo, conn, callback)
    })
  }

  _onDial (peerInfo, conn, callback) {
    const idB58Str = peerInfo.id.toB58String()

    // If already had a dial to me, just add the conn
    if (!this.peers.has(idB58Str)) {
      this.peers.set(idB58Str, new Peer(peerInfo))
    }

    const peer = this.peers.get(idB58Str)
    peer.attachConnection(conn)

    // Immediately send my own subscriptions to the newly established conn
    peer.sendSubscriptions(this.subscriptions)
    setImmediate(() => callback())
  }

  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn', err)
        return pull(pull.empty(), conn)
      }

      const idB58Str = peerInfo.id.toB58String()

      if (!this.peers.has(idB58Str)) {
        log('new peer', idB58Str)
        this.peers.set(idB58Str, new Peer(peerInfo))
      }

      this._processConnection(idB58Str, conn)
    })
  }

  _processConnection (idB58Str, conn) {
    pull(
      conn,
      lp.decode(),
      pull.map((data) => pb.rpc.RPC.decode(data)),
      pull.drain(
        (rpc) => this._onRpc(idB58Str, rpc),
        (err) => this._onConnectionEnd(idB58Str, err)
      )
    )
  }

  _onRpc (idB58Str, rpc) {
    if (!rpc) {
      return
    }

    const subs = rpc.subscriptions
    const msgs = rpc.msgs

    if (msgs && msgs.length) {
      this._processRpcMessages(rpc.msgs)
    }

    if (subs && subs.length) {
      const peer = this.peers.get(idB58Str)
      if (peer) {
        peer.updateSubscriptions(subs)
      }
    }
  }

  _processRpcMessages (msgs) {
    msgs.forEach((msg) => {
      const seqno = utils.msgId(msg.from, msg.seqno.toString())
      // 1. check if I've seen the message, if yes, ignore
      if (this.cache.has(seqno)) {
        return
      }

      this.cache.put(seqno)

      // 2. emit to self
      this._emitMessages(msg.topicCIDs, [msg])

      // 3. propagate msg to others
      this._forwardMessages(msg.topicCIDs, [msg])
    })
  }

  _onConnectionEnd (idB58Str, err) {
    // socket hang up, means the one side canceled
    if (err && err.message !== 'socket hang up') {
      log.err(err)
    }

    this.peers.delete(idB58Str)
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
      if (!peer.isWritable ||
          !utils.anyMatch(peer.topics, topics)) {
        return
      }

      peer.sendMessages(messages)

      log('publish msgs on topics', topics, peer.info.id.toB58String())
    })
  }

  /**
   * Mounts the floodsub protocol onto the libp2p node and sends our
   * subscriptions to every peer conneceted
   *
   * @param {Function} callback
   * @returns {undefined}
   *
   */
  start (callback) {
    if (this.started) {
      return setImmediate(() => callback(new Error('already started')))
    }

    this.libp2p.handle(multicodec, this._onConnection)

    // Speed up any new peer that comes in my way
    this.libp2p.swarm.on('peer-mux-established', this._dialPeer)

    // Dial already connected peers
    const peerInfos = values(this.libp2p.peerBook.getAll())

    asyncEach(peerInfos, (peerInfo, cb) => {
      this._dialPeer(peerInfo, cb)
    }, (err) => {
      setImmediate(() => {
        this.started = true
        callback(err)
      })
    })
  }

  /**
   * Unmounts the floodsub protocol and shuts down every connection
   *
   * @param {Function} callback
   * @returns {undefined}
   *
   */
  stop (callback) {
    if (!this.started) {
      return setImmediate(() => callback(new Error('not started yet')))
    }

    this.libp2p.unhandle(multicodec)
    this.libp2p.swarm.removeListener('peer-mux-established', this._dialPeer)

    asyncEach(this.peers.values(), (peer, cb) => peer.close(cb), (err) => {
      if (err) {
        return callback(err)
      }
      this.peers = new Map()
      this.started = false
      callback()
    })
  }

  /**
   * Publish messages to the given topics.
   *
   * @param {Array<string>|string} topics
   * @param {Array<any>|any} messages
   * @returns {undefined}
   *
   */
  publish (topics, messages) {
    assert(this.started, 'FloodSub is not started')

    log('publish', topics, messages)

    topics = ensureArray(topics)
    messages = ensureArray(messages)

    const from = this.libp2p.peerInfo.id.toB58String()

    const buildMessage = (msg) => {
      const seqno = utils.randomSeqno()
      this.cache.put(utils.msgId(from, seqno))

      return {
        from: from,
        data: msg,
        seqno: new Buffer(seqno),
        topicCIDs: topics
      }
    }

    const msgObjects = messages.map(buildMessage)

    // Emit to self if I'm interested
    this._emitMessages(topics, msgObjects)

    // send to all the other peers
    this._forwardMessages(topics, messages.map(buildMessage))
  }

  /**
   * Subscribe to the given topic(s).
   *
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  subscribe (topics) {
    assert(this.started, 'FloodSub is not started')

    topics = ensureArray(topics)

    topics.forEach((topic) => {
      this.subscriptions.add(topic)
    })

    this.peers.forEach((peer) => checkIfReady(peer))
    // make sure that FloodSub is already mounted
    function checkIfReady (peer) {
      if (peer && peer.isWritable) {
        peer.sendSubscriptions(topics)
      } else {
        setImmediate(checkIfReady.bind(peer))
      }
    }
  }

  /**
   * Unsubscribe from the given topic(s).
   *
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  unsubscribe (topics) {
    assert(this.started, 'FloodSub is not started')
    topics = ensureArray(topics)

    topics.forEach((topic) => {
      this.subscriptions.delete(topic)
    })

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

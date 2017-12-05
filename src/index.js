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

  _addPeer (peer) {
    const id = peer.info.id.toB58String()

    /*
      Always use an existing peer.

      What is happening here is: "If the other peer has already dialed to me, we already have
      an establish link between the two, what might be missing is a
      Connection specifically between me and that Peer"
     */
    let existing = this.peers.get(id)
    if (!existing) {
      log('new peer', id)
      this.peers.set(id, peer)
      existing = peer

      peer.once('close', () => this._removePeer(peer))
    }
    ++existing._references

    return existing
  }

  _removePeer (peer) {
    const id = peer.info.id.toB58String()

    log('remove', id, peer._references)
    // Only delete when no one else is referencing this peer.
    if (--peer._references === 0) {
      log('delete peer', id)
      this.peers.delete(id)
    }

    return peer
  }

  _dialPeer (peerInfo, callback) {
    callback = callback || function noop () {}
    const idB58Str = peerInfo.id.toB58String()

    // If already have a PubSub conn, ignore
    const peer = this.peers.get(idB58Str)
    if (peer && peer.isConnected) {
      return setImmediate(() => callback())
    }

    log('dialing %s', idB58Str)
    this.libp2p.dial(peerInfo, multicodec, (err, conn) => {
      if (err) {
        log.err(err)
        return callback()
      }

      this._onDial(peerInfo, conn, callback)
    })
  }

  _onDial (peerInfo, conn, callback) {
    const idB58Str = peerInfo.id.toB58String()
    log('connected', idB58Str)

    const peer = this._addPeer(new Peer(peerInfo))
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
      const peer = this._addPeer(new Peer(peerInfo))

      this._processConnection(idB58Str, conn, peer)
    })
  }

  _processConnection (idB58Str, conn, peer) {
    pull(
      conn,
      lp.decode(),
      pull.map((data) => pb.rpc.RPC.decode(data)),
      pull.drain(
        (rpc) => this._onRpc(idB58Str, rpc),
        (err) => this._onConnectionEnd(idB58Str, peer, err)
      )
    )
  }

  _onRpc (idB58Str, rpc) {
    if (!rpc) {
      return
    }

    log('rpc from', idB58Str)
    const subs = rpc.subscriptions
    const msgs = rpc.msgs

    if (msgs && msgs.length) {
      this._processRpcMessages(utils.normalizeInRpcMessages(rpc.msgs))
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
      this._emitMessages(msg.topicIDs, [msg])

      // 3. propagate msg to others
      this._forwardMessages(msg.topicIDs, [msg])
    })
  }

  _onConnectionEnd (idB58Str, peer, err) {
    // socket hang up, means the one side canceled
    if (err && err.message !== 'socket hang up') {
      log.err(err)
    }

    log('connection ended', idB58Str, err ? err.message : '')
    this._removePeer(peer)
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
    this.libp2p.on('peer:connect', this._dialPeer)

    // Dial already connected peers
    const peerInfos = values(this.libp2p.peerBook.getAll())

    asyncEach(peerInfos, (peer, cb) => this._dialPeer(peer, cb), (err) => {
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
    this.libp2p.removeListener('peer:connect', this._dialPeer)

    log('stopping')
    asyncEach(this.peers.values(), (peer, cb) => peer.close(cb), (err) => {
      if (err) {
        return callback(err)
      }

      log('stopped')
      this.peers = new Map()
      this.subscriptions = new Set()
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
        topicIDs: topics
      }
    }

    const msgObjects = messages.map(buildMessage)

    // Emit to self if I'm interested
    this._emitMessages(topics, msgObjects)

    // send to all the other peers
    this._forwardMessages(topics, msgObjects)
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
   *
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

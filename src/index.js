'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream/pull')
const empty = require('pull-stream/sources/empty')
const asyncEach = require('async/each')
const TimeCache = require('time-cache')
const debug = require('debug')
const errcode = require('err-code')

const Peer = require('./peer')
const message = require('./message')
const {
  signMessage,
  verifySignature
} = require('./message/sign')
const utils = require('./utils')

const nextTick = require('async/nextTick')

/**
 * PubsubBaseProtocol handles the peers and connections logic for pubsub routers
 */
class PubsubBaseProtocol extends EventEmitter {
  /**
   * @param {String} debugName
   * @param {String} multicodec
   * @param {Object} libp2p libp2p implementation
   * @param {Object} options
   * @param {boolean} options.signMessages if messages should be signed, defaults to true
   * @param {boolean} options.strictSigning if message signing should be required, defaults to true
   * @constructor
   */
  constructor (debugName, multicodec, libp2p, options) {
    super()

    options = {
      signMessages: true,
      strictSigning: true,
      ...options
    }

    this.log = debug(debugName)
    this.log.err = debug(`${debugName}:error`)
    this.multicodec = multicodec
    this.libp2p = libp2p
    this.started = false

    if (options.signMessages) {
      this.peerId = this.libp2p.peerInfo.id
    }

    /**
     * If message signing should be required for incoming messages
     * @type {boolean}
     */
    this.strictSigning = options.strictSigning

    /**
     * Map of topics to which peers are subscribed to
     *
     * @type {Map<string, Peer>}
     */
    this.topics = new Map()

    /**
     * Cache of seen messages
     *
     * @type {TimeCache}
     */
    this.seenCache = new TimeCache()

    /**
     * Map of peers.
     *
     * @type {Map<string, Peer>}
     */
    this.peers = new Map()

    // Dials that are currently in progress
    this._dials = new Set()

    this._onConnection = this._onConnection.bind(this)
    this._dialPeer = this._dialPeer.bind(this)
  }

  /**
   * Add a new connected peer to the peers map.
   * @private
   * @param {PeerInfo} peer peer info
   * @returns {PeerInfo}
   */
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
      this.log('new peer', id)
      this.peers.set(id, peer)
      existing = peer

      peer.once('close', () => this._removePeer(peer))
    }
    ++existing._references

    return existing
  }

  /**
   * Remove a peer from the peers map if it has no references.
   * @private
   * @param {Peer} peer peer state
   * @returns {PeerInfo}
   */
  _removePeer (peer) {
    const id = peer.info.id.toB58String()

    this.log('remove', id, peer._references)
    // Only delete when no one else is referencing this peer.
    if (--peer._references === 0) {
      this.log('delete peer', id)
      this.peers.delete(id)
    }

    return peer
  }

  /**
   * Dial a received peer.
   * @private
   * @param {PeerInfo} peerInfo peer info
   * @param {function} callback
   * @returns {void}
   */
  _dialPeer (peerInfo, callback) {
    callback = callback || function noop () { }
    const idB58Str = peerInfo.id.toB58String()

    // If already have a PubSub conn, ignore
    const peer = this.peers.get(idB58Str)
    if (peer && peer.isConnected) {
      return nextTick(() => callback())
    }

    // If already dialing this peer, ignore
    if (this._dials.has(idB58Str)) {
      this.log('already dialing %s, ignoring dial attempt', idB58Str)
      return nextTick(() => callback())
    }
    this._dials.add(idB58Str)

    this.log('dialing %s', idB58Str)
    this.libp2p.dialProtocol(peerInfo, this.multicodec, (err, conn) => {
      this.log('dial to %s complete', idB58Str)

      // If the dial is not in the set, it means that pubsub has been
      // stopped
      const pubsubStopped = !this._dials.has(idB58Str)
      this._dials.delete(idB58Str)

      if (err) {
        this.log.err(err)
        return callback()
      }

      // pubsub has been stopped, so we should just bail out
      if (pubsubStopped) {
        this.log('pubsub was stopped, not processing dial to %s', idB58Str)
        return callback()
      }

      this._onDial(peerInfo, conn, callback)
    })
  }

  /**
   * Dial a received peer.
   * @private
   * @param {PeerInfo} peerInfo peer info
   * @param {Connection} conn connection to the peer
   * @param {function} callback
   */
  _onDial (peerInfo, conn, callback) {
    const idB58Str = peerInfo.id.toB58String()
    this.log('connected', idB58Str)

    const peer = this._addPeer(new Peer(peerInfo))
    peer.attachConnection(conn)

    nextTick(() => callback())
  }

  /**
   * On successful connection event.
   * @private
   * @param {String} protocol connection protocol
   * @param {Connection} conn connection to the peer
   */
  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        this.log.err('Failed to identify incomming conn', err)
        return pull(empty(), conn)
      }

      const idB58Str = peerInfo.id.toB58String()
      const peer = this._addPeer(new Peer(peerInfo))

      this._processConnection(idB58Str, conn, peer)
    })
  }

  /**
   * Overriding the implementation of _processConnection should keep the connection and is
   * responsible for processing each RPC message received by other peers.
   * @abstract
   * @param {string} idB58Str peer id string in base58
   * @param {Connection} conn connection
   * @param {PeerInfo} peer peer info
   * @returns {undefined}
   *
   */
  _processConnection (idB58Str, conn, peer) {
    throw errcode('_processConnection must be implemented by the subclass', 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * On connection end event.
   * @private
   * @param {string} idB58Str peer id string in base58
   * @param {PeerInfo} peer peer info
   * @param {Error} err error for connection end
   */
  _onConnectionEnd (idB58Str, peer, err) {
    // socket hang up, means the one side canceled
    if (err && err.message !== 'socket hang up') {
      this.log.err(err)
    }

    this.log('connection ended', idB58Str, err ? err.message : '')
    this._removePeer(peer)
  }

  /**
   * Normalizes the message and signs it, if signing is enabled
   *
   * @param {Message} message
   * @param {function(Error, Message)} callback
   */
  _buildMessage (message, callback) {
    const msg = utils.normalizeOutRpcMessage(message)
    if (this.peerId) {
      signMessage(this.peerId, msg, callback)
    } else {
      nextTick(callback, null, msg)
    }
  }

  /**
   * Overriding the implementation of publish should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply publish each message to each topic for every peer
   * @abstract
   * @param {Array<string>|string} topics
   * @param {Array<any>|any} messages
   * @param {function(Error)} callback
   * @returns {undefined}
   *
   */
  publish (topics, messages, callback) {
    throw errcode('publish must be implemented by the subclass', 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of subscribe should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply send a message for every peer showing interest in the topics
   * @abstract
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  subscribe (topics) {
    throw errcode('subscribe must be implemented by the subclass', 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of unsubscribe should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply send a message for every peer revoking interest in the topics
   * @abstract
   * @param {Array<string>|string} topics
   * @returns {undefined}
   */
  unsubscribe (topics) {
    throw errcode('unsubscribe must be implemented by the subclass', 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Mounts the pubsub protocol onto the libp2p node and sends our
   * subscriptions to every peer conneceted
   *
   * @param {Function} callback
   * @returns {undefined}
   *
   */
  start (callback) {
    if (this.started) {
      return nextTick(() => callback(new Error('already started')))
    }
    this.log('starting')

    this.libp2p.handle(this.multicodec, this._onConnection)

    // Speed up any new peer that comes in my way
    this.libp2p.on('peer:connect', this._dialPeer)

    // Dial already connected peers
    const peerInfos = Object.values(this.libp2p.peerBook.getAll())

    asyncEach(peerInfos, (peer, cb) => this._dialPeer(peer, cb), (err) => {
      nextTick(() => {
        this.log('started')
        this.started = true
        callback(err)
      })
    })
  }

  /**
   * Unmounts the pubsub protocol and shuts down every connection
   *
   * @param {Function} callback
   * @returns {undefined}
   *
   */
  stop (callback) {
    if (!this.started) {
      return nextTick(() => callback(new Error('not started yet')))
    }

    this.libp2p.unhandle(this.multicodec)
    this.libp2p.removeListener('peer:connect', this._dialPeer)

    // Prevent any dials that are in flight from being processed
    this._dials = new Set()

    this.log('stopping')
    asyncEach(this.peers.values(), (peer, cb) => peer.close(cb), (err) => {
      if (err) {
        return callback(err)
      }

      this.log('stopped')
      this.peers = new Map()
      this.started = false
      callback()
    })
  }

  /**
   * Validates the given message. The signature will be checked for authenticity.
   * @param {rpc.RPC.Message} message
   * @param {function(Error, Boolean)} callback
   * @returns {void}
   */
  validate (message, callback) {
    // If strict signing is on and we have no signature, abort
    if (this.strictSigning && !message.signature) {
      this.log('Signing required and no signature was present, dropping message:', message)
      return nextTick(callback, null, false)
    }

    // Check the message signature if present
    if (message.signature) {
      verifySignature(message, (err, valid) => {
        if (err) return callback(err)
        callback(null, valid)
      })
    } else {
      // The message is valid
      nextTick(callback, null, true)
    }
  }
}

module.exports = PubsubBaseProtocol
module.exports.message = message
module.exports.utils = utils

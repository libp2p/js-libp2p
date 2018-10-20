'use strict'

const EventEmitter = require('events')
const values = require('lodash/values')
const pull = require('pull-stream')
const asyncEach = require('async/each')
const debug = require('debug')

const Peer = require('./peer')

const setImmediate = require('async/setImmediate')

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
class BaseProtocol extends EventEmitter {
  /**
   * @param {String} debugName
   * @param {String} multicodec
   * @param {Object} libp2p
   * @returns {FloodSub}
   */
  constructor (debugName, multicodec, libp2p) {
    super()

    this.log = debug(debugName)
    this.log.err = debug(`${debugName}:error`)
    this.multicodec = multicodec
    this.libp2p = libp2p
    this.started = false

    /**
     * Map of peers.
     *
     * @type {Map<string, Peer>}
     */
    this.peers = new Map()

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
      this.log('new peer', id)
      this.peers.set(id, peer)
      existing = peer

      peer.once('close', () => this._removePeer(peer))
    }
    ++existing._references

    return existing
  }

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

  _dialPeer (peerInfo, callback) {
    callback = callback || function noop () {}
    const idB58Str = peerInfo.id.toB58String()

    // If already have a PubSub conn, ignore
    const peer = this.peers.get(idB58Str)
    if (peer && peer.isConnected) {
      return setImmediate(() => callback())
    }

    this.log('dialing %s', idB58Str)
    this.libp2p.dialProtocol(peerInfo, this.multicodec, (err, conn) => {
      if (err) {
        this.log.err(err)
        return callback()
      }

      this._onDial(peerInfo, conn, callback)
    })
  }

  _onDial (peerInfo, conn, callback) {
    const idB58Str = peerInfo.id.toB58String()
    this.log('connected', idB58Str)

    const peer = this._addPeer(new Peer(peerInfo))
    peer.attachConnection(conn)

    setImmediate(() => callback())
  }

  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        this.log.err('Failed to identify incomming conn', err)
        return pull(pull.empty(), conn)
      }

      const idB58Str = peerInfo.id.toB58String()
      const peer = this._addPeer(new Peer(peerInfo))

      this._processConnection(idB58Str, conn, peer)
    })
  }

  _processConnection (idB58Str, conn, peer) {
    throw new Error('_processConnection must be implemented by the subclass')
  }

  _onConnectionEnd (idB58Str, peer, err) {
    // socket hang up, means the one side canceled
    if (err && err.message !== 'socket hang up') {
      this.log.err(err)
    }

    this.log('connection ended', idB58Str, err ? err.message : '')
    this._removePeer(peer)
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

    this.libp2p.handle(this.multicodec, this._onConnection)

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

    this.libp2p.unhandle(this.multicodec)
    this.libp2p.removeListener('peer:connect', this._dialPeer)

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
}

module.exports = BaseProtocol

'use strict'

const debug = require('debug')
const EventEmitter = require('events')
const errcode = require('err-code')

const PeerId = require('peer-id')
const MulticodecTopology = require('libp2p-interfaces/src/topology/multicodec-topology')

const message = require('./message')
const Peer = require('./peer')
const utils = require('./utils')
const {
  signMessage,
  verifySignature
} = require('./message/sign')

function validateRegistrar (registrar) {
  // registrar handling
  if (typeof registrar !== 'object') {
    throw new Error('a registrar object is required')
  }

  if (typeof registrar.handle !== 'function') {
    throw new Error('a handle function must be provided in registrar')
  }

  if (typeof registrar.register !== 'function') {
    throw new Error('a register function must be provided in registrar')
  }

  if (typeof registrar.unregister !== 'function') {
    throw new Error('a unregister function must be provided in registrar')
  }
}

/**
 * PubsubBaseProtocol handles the peers and connections logic for pubsub routers
 */
class PubsubBaseProtocol extends EventEmitter {
  /**
   * @param {Object} props
   * @param {String} props.debugName log namespace
   * @param {Array<string>|string} props.multicodecs protocol identificers to connect
   * @param {PeerId} props.peerId peer's peerId
   * @param {Object} props.registrar registrar for libp2p protocols
   * @param {function} props.registrar.handle
   * @param {function} props.registrar.register
   * @param {function} props.registrar.unregister
   * @param {boolean} [props.signMessages] if messages should be signed, defaults to true
   * @param {boolean} [props.strictSigning] if message signing should be required, defaults to true
   * @abstract
   */
  constructor ({
    debugName,
    multicodecs,
    peerId,
    registrar,
    signMessages = true,
    strictSigning = true
  }) {
    if (typeof debugName !== 'string') {
      throw new Error('a debugname `string` is required')
    }

    if (!multicodecs) {
      throw new Error('multicodecs are required')
    }

    if (!PeerId.isPeerId(peerId)) {
      throw new Error('peerId must be an instance of `peer-id`')
    }

    validateRegistrar(registrar)

    super()

    this.log = debug(debugName)
    this.log.err = debug(`${debugName}:error`)

    this.multicodecs = utils.ensureArray(multicodecs)
    this.registrar = registrar

    this.started = false

    this.peerId = peerId

    /**
     * Map of topics to which peers are subscribed to
     *
     * @type {Map<string, Peer>}
     */
    this.topics = new Map()

    /**
     * Map of peers.
     *
     * @type {Map<string, Peer>}
     */
    this.peers = new Map()

    // Message signing
    this.signMessages = signMessages

    /**
     * If message signing should be required for incoming messages
     * @type {boolean}
     */
    this.strictSigning = strictSigning

    this._registrarId = undefined
    this._onIncomingStream = this._onIncomingStream.bind(this)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)
  }

  /**
   * Register the pubsub protocol onto the libp2p node.
   * @returns {Promise<void>}
   */
  async start () {
    if (this.started) {
      return
    }
    this.log('starting')

    // Incoming streams
    this.registrar.handle(this.multicodecs, this._onIncomingStream)

    // register protocol with topology
    const topology = new MulticodecTopology({
      multicodecs: this.multicodecs,
      handlers: {
        onConnect: this._onPeerConnected,
        onDisconnect: this._onPeerDisconnected
      }
    })
    this._registrarId = await this.registrar.register(topology)

    this.log('started')
    this.started = true
  }

  /**
   * Unregister the pubsub protocol and the streams with other peers will be closed.
   * @returns {Promise}
   */
  async stop () {
    if (!this.started) {
      return
    }

    // unregister protocol and handlers
    await this.registrar.unregister(this._registrarId)

    this.log('stopping')
    this.peers.forEach((peer) => peer.close())

    this.peers = new Map()
    this.started = false
    this.log('stopped')
  }

  /**
   * On an incoming stream event.
   * @private
   * @param {Object} props
   * @param {string} props.protocol
   * @param {DuplexStream} props.strean
   * @param {Connection} props.connection connection
   */
  _onIncomingStream ({ protocol, stream, connection }) {
    const peerId = connection.remotePeer
    const idB58Str = peerId.toB58String()

    const peer = this._addPeer(new Peer({
      id: peerId,
      protocols: [protocol]
    }))

    this._processMessages(idB58Str, stream, peer)
  }

  /**
   * Registrar notifies a connection successfully with pubsub protocol.
   * @private
   * @param {PeerId} peerId remote peer-id
   * @param {Connection} conn connection to the peer
   */
  async _onPeerConnected (peerId, conn) {
    const idB58Str = peerId.toB58String()
    this.log('connected', idB58Str)

    const peer = this._addPeer(new Peer({
      id: peerId,
      protocols: this.multicodecs
    }))

    if (peer.isConnected) {
      return
    }

    try {
      const { stream } = await conn.newStream(this.multicodecs)
      peer.attachConnection(stream)
    } catch (err) {
      this.log.err(err)
    }
  }

  /**
   * Registrar notifies a closing connection with pubsub protocol.
   * @private
   * @param {PeerId} peerId peerId
   * @param {Error} err error for connection end
   */
  _onPeerDisconnected (peerId, err) {
    const idB58Str = peerId.toB58String()
    const peer = this.peers.get(idB58Str)

    this.log('connection ended', idB58Str, err ? err.message : '')
    this._removePeer(peer)
  }

  /**
   * Add a new connected peer to the peers map.
   * @private
   * @param {Peer} peer internal peer
   * @returns {Peer}
   */
  _addPeer (peer) {
    const id = peer.id.toB58String()
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
   * Remove a peer from the peers map.
   * @private
   * @param {Peer} peer peer state
   * @returns {Peer}
   */
  _removePeer (peer) {
    if (!peer) return
    const id = peer.id.toB58String()

    this.log('remove', id, peer._references)

    // Only delete when no one else is referencing this peer.
    if (--peer._references === 0) {
      this.log('delete peer', id)
      this.peers.delete(id)
    }

    return peer
  }

  /**
   * Validates the given message. The signature will be checked for authenticity.
   * @param {rpc.RPC.Message} message
   * @returns {Promise<Boolean>}
   */
  async validate (message) { // eslint-disable-line require-await
    // If strict signing is on and we have no signature, abort
    if (this.strictSigning && !message.signature) {
      this.log('Signing required and no signature was present, dropping message:', message)
      return false
    }

    // Check the message signature if present
    if (message.signature) {
      return verifySignature(message)
    } else {
      return true
    }
  }

  /**
   * Normalizes the message and signs it, if signing is enabled
   * @private
   * @param {Message} message
   * @returns {Promise<Message>}
   */
  _buildMessage (message) {
    const msg = utils.normalizeOutRpcMessage(message)
    if (this.signMessages) {
      return signMessage(this.peerId, msg)
    } else {
      return message
    }
  }

  /**
   * Get a list of the peer-ids that are subscribed to one topic.
   * @param {string} topic
   * @returns {Array<string>}
   */
  getSubscribers (topic) {
    if (!this.started) {
      throw errcode(new Error('not started yet'), 'ERR_NOT_STARTED_YET')
    }

    if (!topic || typeof topic !== 'string') {
      throw errcode(new Error('a string topic must be provided'), 'ERR_NOT_VALID_TOPIC')
    }

    return Array.from(this.peers.values())
      .filter((peer) => peer.topics.has(topic))
      .map((peer) => peer.id.toB58String())
  }

  /**
   * Overriding the implementation of publish should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply publish each message to each topic for every peer
   * @abstract
   * @param {Array<string>|string} topics
   * @param {Array<any>|any} messages
   * @returns {Promise}
   *
   */
  publish (topics, messages) {
    throw errcode(new Error('publish must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of subscribe should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply send a message for every peer showing interest in the topics
   * @abstract
   * @param {Array<string>|string} topics
   * @returns {void}
   */
  subscribe (topics) {
    throw errcode(new Error('subscribe must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of unsubscribe should handle the appropriate algorithms for the publish/subscriber implementation.
   * For example, a Floodsub implementation might simply send a message for every peer revoking interest in the topics
   * @abstract
   * @param {Array<string>|string} topics
   * @returns {void}
   */
  unsubscribe (topics) {
    throw errcode(new Error('unsubscribe must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of getTopics should handle the appropriate algorithms for the publish/subscriber implementation.
   * Get the list of subscriptions the peer is subscribed to.
   * @abstract
   * @returns {Array<string>}
   */
  getTopics () {
    throw errcode(new Error('getTopics must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Overriding the implementation of _processMessages should keep the connection and is
   * responsible for processing each RPC message received by other peers.
   * @abstract
   * @param {string} idB58Str peer id string in base58
   * @param {Connection} conn connection
   * @param {Peer} peer A Pubsub Peer
   * @returns {void}
   *
   */
  _processMessages (idB58Str, conn, peer) {
    throw errcode(new Error('_processMessages must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }
}

module.exports = PubsubBaseProtocol
module.exports.message = message
module.exports.utils = utils

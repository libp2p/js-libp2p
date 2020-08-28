'use strict'

const debug = require('debug')
const log = debug('libp2p:auto-relay')
log.error = debug('libp2p:auto-relay:error')

const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')
const multiaddr = require('multiaddr')

const { relay: multicodec } = require('./multicodec')
const { canHop } = require('./circuit/hop')

const hopMetadataKey = 'hop_relay'

class AutoRelay {
  /**
   * Creates an instance of AutoRelay
   * @constructor
   * @param {object} params
   * @param {Libp2p} params.libp2p
   * @param {number} params.maxListeners maximum number of relays to listen.
   */
  constructor ({ libp2p, maxListeners }) {
    this._libp2p = libp2p
    this._peerId = libp2p.peerId
    this._registrar = libp2p.registrar
    this._peerStore = libp2p.peerStore
    this._connectionManager = libp2p.connectionManager
    this._transportManager = libp2p.transportManager

    this.maxListeners = maxListeners

    /**
     * @type {Set<string>}
     */
    this._listenRelays = new Set()

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    this._peerStore.on('change:protocols', this._onProtocolChange)
    this._connectionManager.on('peer:disconnect', this._onPeerDisconnected)

    // TODO: proactively try to connect via connMgr
  }

  /**
   * Check if a new peer supports the multicodec for the relay.
   * @param {Object} props
   * @param {PeerId} props.peerId
   * @param {Array<string>} props.protocols
   * @return {Promise<void>}
   */
  async _onProtocolChange ({ peerId, protocols }) {
    const id = peerId.toB58String()

    // Check if it has the protocol
    const hasProtocol = protocols.find(protocol => protocol === multicodec)

    // If no protocol, check if we were keeping the peer before as a listenRelay
    if (!hasProtocol && this._listenRelays.has(id)) {
      await this._removeListenRelay(id)
      this._listenOnAvailableHopRelays()
      return
    } else if (!hasProtocol || this._listenRelays.has(id)) {
      return
    }

    // If protocol, check if can hop, store info in the metadataBook and listen on it
    try {
      const connection = this._connectionManager.get(peerId)

      await canHop({ connection })

      // Save peer metadata
      this._peerStore.metadataBook.set(peerId, hopMetadataKey, uint8ArrayFromString('true'))

      // Listen on relay
      await this._addListenRelay(connection, id)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Peer disconnects.
   * @param {Connection} connection connection to the peer
   * @return {Promise<void>}
   */
  async _onPeerDisconnected (connection) {
    const peerId = connection.remotePeer
    const id = peerId.toB58String()

    // Not listening on this relay
    if (!this._listenRelays.has(id)) {
      return
    }

    await this._removeListenRelay(id)
    await this._listenOnAvailableHopRelays()
  }

  /**
   * Attempt to listen on the given relay connection.
   * @private
   * @param {Connection} connection connection to the peer
   * @param {string} id peer identifier string
   * @return {Promise<void>}
   */
  async _addListenRelay (connection, id) {
    // Check if already listening on enough relays
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    this._listenRelays.add(id)

    // Create relay listen addr
    const remoteMultiaddr = connection.remoteAddr
    let listenAddr

    if (!remoteMultiaddr.protoNames().includes('p2p')) {
      listenAddr = `${remoteMultiaddr.toString()}/p2p/${connection.remotePeer.toB58String()}/p2p-circuit/p2p/${this._peerId.toB58String()}`
    } else {
      listenAddr = `${remoteMultiaddr.toString()}/p2p-circuit/p2p/${this._peerId.toB58String()}`
    }

    // Attempt to listen on relay
    try {
      await this._transportManager.listen([multiaddr(listenAddr)])
    } catch (err) {
      log.error(err)
      this._listenRelays.delete(id)
    }
  }

  /**
   * Remove listen relay.
   * @private
   * @param {string} id peer identifier string.
   */
  _removeListenRelay (id) {
    this._listenRelays.delete(id)

    // TODO: remove listen
    // TODO: check if we really need to do this
  }

  /**
   * Try to listen on available hop relay connections.
   * @return {Promise<void>}
   */
  async _listenOnAvailableHopRelays () {
    // Check if already listening on enough relays
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    // Verify if there are available connections to hop
    for (const [connection] of this._connectionManager.connections.values()) {
      const peerId = connection.remotePeer
      const id = peerId.toB58String()

      // Continue to next if listening on this
      if (this._listenRelays.has(id)) {
        continue
      }

      const supportsHop = this._peerStore.metadataBook.getValue(peerId, hopMetadataKey)

      // Continue to next if it does not support Hop
      if (!supportsHop || uint8ArrayToString(supportsHop) !== 'true') {
        continue
      }

      await this._addListenRelay(connection, id)

      // Check if already listening on enough relays
      if (this._listenRelays.size >= this.maxListeners) {
        break
      }
    }
    // Auto dial: Iterate peer store...
  }
}

// TODO: be careful about relay connect to relay peer that might create a double relayed conn

module.exports = AutoRelay

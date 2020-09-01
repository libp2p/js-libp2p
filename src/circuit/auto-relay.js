'use strict'

const debug = require('debug')
const log = debug('libp2p:auto-relay')
log.error = debug('libp2p:auto-relay:error')

const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')
const multiaddr = require('multiaddr')

const { relay: multicodec } = require('./multicodec')
const { canHop } = require('./circuit/hop')

const circuitProtoCode = 290
const hopMetadataKey = 'hop_relay'
const hopMetadataValue = 'true'

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
  }

  /**
   * Check if a new peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove listen relay.
   * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
   * inside the threshold.
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
      this._removeListenRelay(id)
      return
    } else if (!hasProtocol || this._listenRelays.has(id)) {
      return
    }

    // If protocol, check if can hop, store info in the metadataBook and listen on it
    try {
      const connection = this._connectionManager.get(peerId)

      // Do not hop on a relayed connection
      if (connection.remoteAddr.protoCodes().includes(circuitProtoCode)) {
        log(`relayed connection to ${id} will not be used to hop on`)
        return
      }

      await canHop({ connection })
      this._peerStore.metadataBook.set(peerId, hopMetadataKey, uint8ArrayFromString(hopMetadataValue))
      await this._addListenRelay(connection, id)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Peer disconnects.
   * @param {Connection} connection connection to the peer
   * @return {void}
   */
  _onPeerDisconnected (connection) {
    const peerId = connection.remotePeer
    const id = peerId.toB58String()

    // Not listening on this relay
    if (!this._listenRelays.has(id)) {
      return
    }

    this._removeListenRelay(id)
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
   * @return {void}
   */
  _removeListenRelay (id) {
    this._listenRelays.delete(id)
    // TODO: this should be responsibility of the connMgr
    this._listenOnAvailableHopRelays()
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
      if (!supportsHop || uint8ArrayToString(supportsHop) !== hopMetadataValue) {
        continue
      }

      await this._addListenRelay(connection, id)

      // Check if already listening on enough relays
      if (this._listenRelays.size >= this.maxListeners) {
        break
      }
    }
  }
}

module.exports = AutoRelay

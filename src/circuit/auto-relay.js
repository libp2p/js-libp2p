'use strict'

const debug = require('debug')
const log = debug('libp2p:auto-relay')
log.error = debug('libp2p:auto-relay:error')

const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

const { relay: multicodec } = require('./multicodec')
const { canHop } = require('./circuit/hop')

const circuitProtoCode = 290
const hopMetadataKey = 'hop_relay'
const hopMetadataValue = 'true'

class AutoRelay {
  /**
   * Creates an instance of AutoRelay.
   * @constructor
   * @param {object} props
   * @param {Libp2p} props.libp2p
   * @param {number} [props.maxListeners = 1] maximum number of relays to listen.
   */
  constructor ({ libp2p, maxListeners = 1 }) {
    this._libp2p = libp2p
    this._peerId = libp2p.peerId
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
   * Check if a peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
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

      const supportsHop = await canHop({ connection })

      if (supportsHop) {
        this._peerStore.metadataBook.set(peerId, hopMetadataKey, uint8ArrayFromString(hopMetadataValue))
        await this._addListenRelay(connection, id)
      }
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

    // Create relay listen addr
    let listenAddr, remoteMultiaddr

    try {
      const remoteAddrs = this._peerStore.addressBook.get(connection.remotePeer)
      // TODO: HOP Relays should avoid advertising private addresses!
      remoteMultiaddr = remoteAddrs.find(a => a.isCertified).multiaddr // Get first announced address certified
    } catch (_) {
      log.error(`${id} does not have announced certified multiaddrs`)
      return
    }

    if (!remoteMultiaddr.protoNames().includes('p2p')) {
      listenAddr = `${remoteMultiaddr.toString()}/p2p/${connection.remotePeer.toB58String()}/p2p-circuit`
    } else {
      listenAddr = `${remoteMultiaddr.toString()}/p2p-circuit`
    }

    // Attempt to listen on relay
    this._listenRelays.add(id)

    try {
      await this._transportManager.listen([multiaddr(listenAddr)])
      // Announce multiaddrs will update on listen success by TransportManager event being triggered
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
    if (this._listenRelays.delete(id)) {
      // TODO: this should be responsibility of the connMgr
      this._listenOnAvailableHopRelays([id])
    }
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays.
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected.
   * 2. Dial and try to listen on the peers we know that support hop but are not connected.
   * 3. Search the network.
   * @param {Array<string>} [peersToIgnore]
   * @return {Promise<void>}
   */
  async _listenOnAvailableHopRelays (peersToIgnore = []) {
    // TODO: The peer redial issue on disconnect should be handled by connection gating
    // Check if already listening on enough relays
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    const knownHopsToDial = []

    // Check if we have known hop peers to use and attempt to listen on the already connected
    for (const [id, metadataMap] of this._peerStore.metadataBook.data.entries()) {
      // Continue to next if listening on this or peer to ignore
      if (this._listenRelays.has(id) || peersToIgnore.includes(id)) {
        continue
      }

      const supportsHop = metadataMap.get(hopMetadataKey)

      // Continue to next if it does not support Hop
      if (!supportsHop || uint8ArrayToString(supportsHop) !== hopMetadataValue) {
        continue
      }

      const peerId = PeerId.createFromCID(id)
      const connection = this._connectionManager.get(peerId)

      // If not connected, store for possible later use.
      if (!connection) {
        knownHopsToDial.push(peerId)
        continue
      }

      await this._addListenRelay(connection, id)

      // Check if already listening on enough relays
      if (this._listenRelays.size >= this.maxListeners) {
        return
      }
    }

    // Try to listen on known peers that are not connected
    for (const peerId of knownHopsToDial) {
      const connection = await this._libp2p.dial(peerId)
      await this._addListenRelay(connection, peerId.toB58String())

      // Check if already listening on enough relays
      if (this._listenRelays.size >= this.maxListeners) {
        return
      }
    }

    // TODO: Try to find relays to hop on the network
  }
}

module.exports = AutoRelay

'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:auto-relay'), {
  error: debug('libp2p:auto-relay:err')
})

const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')

const { relay: multicodec } = require('./multicodec')
const { canHop } = require('./circuit/hop')
const { namespaceToCid } = require('./utils')
const {
  CIRCUIT_PROTO_CODE,
  HOP_METADATA_KEY,
  HOP_METADATA_VALUE,
  RELAY_RENDEZVOUS_NS
} = require('./constants')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('../peer-store/address-book').Address} Address
 */

/**
 * @typedef {Object} AutoRelayProperties
 * @property {import('../')} libp2p
 *
 * @typedef {Object} AutoRelayOptions
 * @property {number} [maxListeners = 1] - maximum number of relays to listen.
 * @property {(error: Error, msg?: string) => {}} [onError]
 */

class AutoRelay {
  /**
   * Creates an instance of AutoRelay.
   *
   * @class
   * @param {AutoRelayProperties & AutoRelayOptions} props
   */
  constructor ({ libp2p, maxListeners = 1, onError }) {
    this._libp2p = libp2p
    this._peerId = libp2p.peerId
    this._peerStore = libp2p.peerStore
    this._connectionManager = libp2p.connectionManager
    this._transportManager = libp2p.transportManager
    this._addressSorter = libp2p.dialer.addressSorter

    this.maxListeners = maxListeners

    /**
     * @type {Set<string>}
     */
    this._listenRelays = new Set()

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    this._peerStore.on('change:protocols', this._onProtocolChange)
    this._connectionManager.on('peer:disconnect', this._onPeerDisconnected)

    /**
     * @param {Error} error
     * @param {string} [msg]
     */
    this._onError = (error, msg) => {
      log.error(msg || error)
      onError && onError(error, msg)
    }
  }

  /**
   * Check if a peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
   * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
   * inside the threshold.
   *
   * @param {Object} props
   * @param {PeerId} props.peerId
   * @param {string[]} props.protocols
   * @returns {Promise<void>}
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
      if (!connection) {
        return
      }

      // Do not hop on a relayed connection
      if (connection.remoteAddr.protoCodes().includes(CIRCUIT_PROTO_CODE)) {
        log(`relayed connection to ${id} will not be used to hop on`)
        return
      }

      const supportsHop = await canHop({ connection })

      if (supportsHop) {
        this._peerStore.metadataBook.set(peerId, HOP_METADATA_KEY, uint8ArrayFromString(HOP_METADATA_VALUE))
        await this._addListenRelay(connection, id)
      }
    } catch (err) {
      this._onError(err)
    }
  }

  /**
   * Peer disconnects.
   *
   * @param {Connection} connection - connection to the peer
   * @returns {void}
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
   *
   * @private
   * @param {Connection} connection - connection to the peer
   * @param {string} id - peer identifier string
   * @returns {Promise<void>}
   */
  async _addListenRelay (connection, id) {
    // Check if already listening on enough relays
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    // Get peer known addresses and sort them per public addresses first
    const remoteAddrs = this._peerStore.addressBook.getMultiaddrsForPeer(
      connection.remotePeer, this._addressSorter
    )

    if (!remoteAddrs || !remoteAddrs.length) {
      return
    }

    const listenAddr = `${remoteAddrs[0].toString()}/p2p-circuit`
    this._listenRelays.add(id)

    // Attempt to listen on relay
    try {
      await this._transportManager.listen([new Multiaddr(listenAddr)])
      // Announce multiaddrs will update on listen success by TransportManager event being triggered
    } catch (err) {
      this._onError(err)
      this._listenRelays.delete(id)
    }
  }

  /**
   * Remove listen relay.
   *
   * @private
   * @param {string} id - peer identifier string.
   * @returns {void}
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
   *
   * @param {string[]} [peersToIgnore]
   * @returns {Promise<void>}
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

      const supportsHop = metadataMap.get(HOP_METADATA_KEY)

      // Continue to next if it does not support Hop
      if (!supportsHop || uint8ArrayToString(supportsHop) !== HOP_METADATA_VALUE) {
        continue
      }

      const peerId = PeerId.createFromB58String(id)
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
      await this._tryToListenOnRelay(peerId)

      // Check if already listening on enough relays
      if (this._listenRelays.size >= this.maxListeners) {
        return
      }
    }

    // Try to find relays to hop on the network
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      for await (const provider of this._libp2p.contentRouting.findProviders(cid)) {
        if (!provider.multiaddrs.length) {
          continue
        }

        const peerId = provider.id
        this._peerStore.addressBook.add(peerId, provider.multiaddrs)

        await this._tryToListenOnRelay(peerId)

        // Check if already listening on enough relays
        if (this._listenRelays.size >= this.maxListeners) {
          return
        }
      }
    } catch (err) {
      this._onError(err)
    }
  }

  /**
   * @param {PeerId} peerId
   */
  async _tryToListenOnRelay (peerId) {
    try {
      const connection = await this._libp2p.dial(peerId)
      await this._addListenRelay(connection, peerId.toB58String())
    } catch (err) {
      this._onError(err, `could not connect and listen on known hop relay ${peerId.toB58String()}`)
    }
  }
}

module.exports = AutoRelay

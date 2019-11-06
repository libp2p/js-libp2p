'use strict'

const assert = require('assert')

class Topology {
  /**
   * @param {Object} props
   * @param {number} props.min minimum needed connections (default: 0)
   * @param {number} props.max maximum needed connections (default: Infinity)
   * @param {Array<string>} props.multicodecs protocol multicodecs
   * @param {Object} props.handlers
   * @param {function} props.handlers.onConnect protocol "onConnect" handler
   * @param {function} props.handlers.onDisconnect protocol "onDisconnect" handler
   * @constructor
   */
  constructor ({
    min = 0,
    max = Infinity,
    multicodecs,
    handlers
  }) {
    assert(multicodecs, 'one or more multicodec should be provided')
    assert(handlers, 'the handlers should be provided')
    assert(handlers.onConnect && typeof handlers.onConnect === 'function',
      'the \'onConnect\' handler must be provided')
    assert(handlers.onDisconnect && typeof handlers.onDisconnect === 'function',
      'the \'onDisconnect\' handler must be provided')

    this.multicodecs = Array.isArray(multicodecs) ? multicodecs : [multicodecs]
    this.min = min
    this.max = max

    // Handlers
    this._onConnect = handlers.onConnect
    this._onDisconnect = handlers.onDisconnect

    this.peers = new Map()
    this._registrar = undefined

    this._onProtocolChange = this._onProtocolChange.bind(this)
  }

  set registrar (registrar) {
    this._registrar = registrar
    this._registrar.peerStore.on('change:protocols', this._onProtocolChange)

    // Update topology peers
    this._updatePeers(this._registrar.peerStore.peers.values())
  }

  /**
   * Update topology.
   * @param {Array<PeerInfo>} peerInfoIterable
   * @returns {void}
   */
  _updatePeers (peerInfoIterable) {
    for (const peerInfo of peerInfoIterable) {
      if (this.multicodecs.filter(multicodec => peerInfo.protocols.has(multicodec))) {
        // Add the peer regardless of whether or not there is currently a connection
        this.peers.set(peerInfo.id.toB58String(), peerInfo)
        // If there is a connection, call _onConnect
        const connection = this._registrar.getConnection(peerInfo)
        connection && this._onConnect(peerInfo, connection)
      } else {
        // Remove any peers we might be tracking that are no longer of value to us
        this.peers.delete(peerInfo.id.toB58String())
      }
    }
  }

  /**
   * Notify protocol of peer disconnected.
   * @param {PeerInfo} peerInfo
   * @param {Error} [error]
   * @returns {void}
   */
  disconnect (peerInfo, error) {
    this._onDisconnect(peerInfo, error)
  }

  /**
   * Check if a new peer support the multicodecs for this topology.
   * @param {Object} props
   * @param {PeerInfo} props.peerInfo
   * @param {Array<string>} props.protocols
   */
  _onProtocolChange ({ peerInfo, protocols }) {
    const existingPeer = this.peers.get(peerInfo.id.toB58String())
    const hasProtocol = protocols.filter(protocol => this.multicodecs.includes(protocol))

    // Not supporting the protocol anymore?
    if (existingPeer && hasProtocol.length === 0) {
      this._onDisconnect({
        peerInfo
      })
    }

    // New to protocol support
    for (const protocol of protocols) {
      if (this.multicodecs.includes(protocol)) {
        this._updatePeers([peerInfo])
        return
      }
    }
  }
}

module.exports = Topology

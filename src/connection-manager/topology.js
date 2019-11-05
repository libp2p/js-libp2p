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

    // Add connected peers to the topology
    this._addConnectedPeers()
    // TODO: remaining peers in the store
  }

  /**
   * Add connected peers to the topology.
   */
  _addConnectedPeers () {
    const knownPeers = []

    for (const [, peer] of this._registrar.peerStore.peers) {
      if (this.multicodecs.filter(multicodec => peer.protocols.has(multicodec))) {
        knownPeers.push(peer)
      }
    }

    for (const [id, conn] of this._registrar.connections.entries()) {
      const targetPeer = knownPeers.find((peerInfo) => peerInfo.id.toB58String() === id)

      if (targetPeer) {
        // TODO: what should we return
        this.tryToConnect(targetPeer, conn[0])
      }
    }
  }

  /**
   * Try to add a connected peer to the topology, if inside the thresholds.
   * @param {PeerInfo} peerInfo
   * @param {Connection} connection
   * @returns {void}
   */
  tryToConnect (peerInfo, connection) {
    // TODO: conn manager should validate if it should try to connect

    this._onConnect(peerInfo, connection)

    this.peers.set(peerInfo.id.toB58String(), peerInfo)
  }

  /**
   * Notify protocol of peer disconnected.
   * @param {PeerInfo} peerInfo
   * @param {Error} [error]
   * @returns {void}
   */
  disconnect (peerInfo, error) {
    if (this.peers.delete(peerInfo.id.toB58String())) {
      this._onDisconnect(peerInfo, error)
    }
  }

  /**
   * Check if a new peer support the multicodecs for this topology.
   * @param {Object} props
   * @param {PeerInfo} props.peerInfo
   * @param {Array<string>} props.protocols
   */
  _onProtocolChange ({ peerInfo, protocols }) {
    const existingPeer = this.peers.get(peerInfo.id.toB58String())

    protocols.filter(protocol => this.multicodecs.includes(protocol))

    // Not supporting the protocol anymore?
    if (existingPeer && protocols.filter(protocol => this.multicodecs.includes(protocol)).length === 0) {
      this._onDisconnect({
        peerInfo
      })
    }

    // New to protocol support
    for (const protocol of protocols) {
      if (this.multicodecs.includes(protocol)) {
        this.tryToConnect(peerInfo, this._registrar.getConnection(peerInfo))
        return
      }
    }
  }
}

module.exports = Topology

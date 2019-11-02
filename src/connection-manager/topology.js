'use strict'

class Topology {
  /**
   * @param {Object} props
   * @param {number} props.min minimum needed connections (default: 0)
   * @param {number} props.max maximum needed connections (default: Infinity)
   * @param {function} props.onConnect protocol "onConnect" handler
   * @param {function} props.onDisconnect protocol "onDisconnect" handler
   * @param {Array<string>} props.multicodecs protocol multicodecs
   * @param {Registrar} registrar
   * @constructor
   */
  constructor ({
    min = 0,
    max = Infinity,
    onConnect,
    onDisconnect,
    multicodecs,
    registrar
  }) {
    this.multicodecs = multicodecs
    this.registrar = registrar
    this.min = min
    this.max = max
    this.peers = new Map()

    // Handlers
    this._onConnect = onConnect
    this._onDisconnect = onDisconnect

    this._onProtocolChange = this._onProtocolChange.bind(this)

    // Set by the registrar
    this._peerStore = null
  }

  /**
   * Set peerstore to the topology.
   * @param {PeerStore} peerStore
   */
  set peerStore (peerStore) {
    this._peerStore = peerStore

    this._peerStore.on('change:protocols', this._onProtocolChange)
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
        this.tryToConnect(peerInfo, this.registrar.getPeerConnection(peerInfo))
        return
      }
    }
  }
}

module.exports = Topology

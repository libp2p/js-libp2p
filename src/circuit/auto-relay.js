'use strict'

const debug = require('debug')
const log = debug('libp2p:auto-relay')
log.error = debug('libp2p:auto-relay:error')

const multiaddr = require('multiaddr')
const MulticodecTopology = require('libp2p-interfaces/src/topology/multicodec-topology')

const { relay: multicodec } = require('./multicodec')
const { canHop } = require('./circuit/hop')

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

    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    // register protocol with topology
    const topology = new MulticodecTopology({
      multicodecs: multicodec,
      handlers: {
        onConnect: this._onPeerConnected,
        onDisconnect: this._onPeerDisconnected
      }
    })
    this._registrar.register(topology)

    // TODO: should proactively try to connect?
    // We need to figure out a more general approach for the autoDial with topologies
  }

  /**
   * Registrar notifies a connection successfully with circuit protocol.
   * @private
   * @param {PeerId} peerId remote peer-id
   * @param {Connection} connection connection to the peer
   */
  async _onPeerConnected (peerId, connection) {
    // Check if already listening on enough relays
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    const idB58Str = peerId.toB58String()
    log('connected', idB58Str)

    // Check if already listening on the relay
    if (this._listenRelays.has(idB58Str)) {
      return
    }

    await this._addListenRelay(connection, idB58Str)
  }

  /**
   * Attempt to listen on the given relay connection.
   * @private
   * @param {Connection} connection connection to the peer
   * @param {string} idB58Str peer id string
   * @return {Promise<void>}
   */
  async _addListenRelay (connection, idB58Str) {
    try {
      this._listenRelays.add(idB58Str)
      // Ask if relay can hop
      await canHop({ connection })

      // Create relay listen addr
      const remoteMultiaddr = connection.remoteAddr
      let listenAddr

      if (!remoteMultiaddr.protoNames().includes('p2p')) {
        listenAddr = `${remoteMultiaddr.toString()}/p2p/${connection.remotePeer.toB58String()}/p2p-circuit/p2p/${this._peerId.toB58String()}`
      } else {
        listenAddr = `${remoteMultiaddr.toString()}/p2p-circuit/p2p/${this._peerId.toB58String()}`
      }

      // Listen on relay
      await this._transportManager.listen([multiaddr(listenAddr)])

      log('listening on', listenAddr)
    } catch (err) {
      log.error(err)
      this._listenRelays.delete(idB58Str)
    }
  }

  /**
   * Registrar notifies a closing connection with circuit protocol.
   * @private
   * @param {PeerId} peerId peerId
   * @param {Error} err error for connection end
   * @returns {Promise<void>}
   */
  async _onPeerDisconnected (peerId, err) {
    const idB58Str = peerId.toB58String()

    // Not listening on this relay
    if (!this._listenRelays.has(idB58Str)) {
      return
    }

    log('connection ended', idB58Str, err ? err.message : '')

    this._listenRelays.delete(idB58Str)

    // Listen on alternative relays if available and not listenning on maximum
    if (this._listenRelays.size >= this.maxListeners) {
      return
    }

    log('try to listen on other connected peers with circuit')

    // TODO: change to have a map of backUp relay nodes instead to simplify?
    // Iterate over open connections
    for (const [connection] of this._connectionManager.connections.values()) {
      const idB58Str = connection.remotePeer.toB58String()
      const protocols = this._peerStore.protoBook.get(connection.remotePeer) || []

      // If has protocol and is not being used, attempt to listen
      if (protocols.includes(multicodec) && !this._listenRelays.has(idB58Str)) {
        await this._addListenRelay(connection, idB58Str)
      }

      if (this._listenRelays.size >= this.maxListeners) {
        break
      }
    }

    // Listen on alternative relays if available and not listenning on maxListeners
    // if (this._listenRelays.size >= this.maxListeners) {
    //   return
    // }

    // TODO: iterate over peer store for possible peers to connect if below max?
    // for (const peer of this._peerStore.peers.values()) {
    //   const idB58Str = peer.id.toB58String()
    //   // TODO: should it avoid to try the peer in question?
    //   if (peer.id.equals(peerId) || this._listenRelays.has(idB58Str)) {
    //     continue
    //   }
    // }
  }
}

// TODO: be careful about relay connect to relay peer that might create a double relayed conn
// TODO: trigger identify to share new signed peer record

module.exports = AutoRelay

'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')
const errCode = require('err-code')

const { Connection } = require('libp2p-interfaces/src/connection')
const PeerInfo = require('peer-info')
const MulticodecTopology = require('./connection-manager/topology')

/**
 * Responsible for notifying registered protocols of events in the network.
 */
class Registrar {
  /**
   * @param {PeerStore} peerStore
   * @constructor
   */
  constructor (peerStore) {
    this.peerStore = peerStore

    /**
     * Map of connections per peer
     * TODO: this should be handled by connectionManager
     * @type {Map<string, conn>}
     */
    this.connections = new Map()

    /**
     * Map of topologies per multicodec
     *
     * @type {Map<string, object>}
     */
    this.multicodecTopologies = new Map()

    this._handle = undefined
  }

  get handle () {
    return this._handle
  }

  set handle (handle) {
    this._handle = handle
  }

  /**
   * Add a new connected peer to the record
   * TODO: this should live in the ConnectionManager
   * @param {PeerInfo} peerInfo
   * @param {Connection} conn
   * @returns {void}
   */
  onConnect (peerInfo, conn) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')
    assert(Connection.isConnection(conn), 'conn must be an instance of interface-connection')

    this.connections.set(peerInfo.id.toB58String(), conn)
  }

  /**
   * Remove a disconnected peer from the record
   * TODO: this should live in the ConnectionManager
   * @param {PeerInfo} peerInfo
   * @param {Error} [error]
   * @returns {void}
   */
  onDisconnect (peerInfo, error) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    for (const [, topology] of this.multicodecTopologies) {
      topology.disconnect(peerInfo, error)
    }

    this.connections.delete(peerInfo.id.toB58String())
  }

  /**
   * Get a connection with a peer.
   * @param {PeerInfo} peerInfo
   * @returns {Connection}
   */
  getPeerConnection (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    return this.connections.get(peerInfo.id.toB58String())
  }

  /**
   * Register handlers for a set of multicodecs given
   * @param {Array<string>|string} multicodecs
   * @param {object} handlers
   * @param {function} handlers.onConnect
   * @param {function} handlers.onDisconnect
   * @param {object} topology properties for topology
   * @return {string} registrar identifier
   */
  register (multicodecs, handlers, topology = {}) {
    if (!multicodecs) {
      throw errCode(new Error('one or more multicodec should be provided'), 'ERR_NO_MULTICODECS')
    } else if (!Array.isArray(multicodecs)) {
      multicodecs = [multicodecs]
    }

    if (!handlers) {
      throw errCode(new Error('the handlers should be provided'), 'ERR_NO_HANDLERS')
    } else if (!handlers.onConnect || typeof handlers.onConnect !== 'function') {
      throw errCode(new Error('the \'onConnect\' handler must be provided'), 'ERR_NO_ONCONNECT_HANDLER')
    } else if (!handlers.onDisconnect || typeof handlers.onDisconnect !== 'function') {
      throw errCode(new Error('the \'onDisconnect\' handler must be provided'), 'ERR_NO_ONDISCONNECT_HANDLER')
    }

    // Create multicodec topology
    const multicodecTopology = new MulticodecTopology({
      onConnect: handlers.onConnect,
      onDisconnect: handlers.onDisconnect,
      registrar: this,
      multicodecs,
      ...topology
    })

    multicodecTopology.peerStore = this.peerStore

    const id = (parseInt(Math.random() * 1e9)).toString(36) + Date.now()
    this.multicodecTopologies.set(id, multicodecTopology)

    this._addConnectedPeers(multicodecs, multicodecTopology)

    // TODO: try to connect to peers-store peers according to current topology

    return id
  }

  _addConnectedPeers (multicodecs, multicodecTopology) {
    const knownPeers = this.peerStore.getAllArray()
      .filter((peerInfo) => multicodecs.filter(multicodec => peerInfo.protocols.has(multicodec)))

    for (const [id, conn] of this.connections.entries()) {
      const targetPeer = knownPeers.find((peerInfo) => peerInfo.id.toB58String() === id)

      if (targetPeer) {
        multicodecTopology.tryToConnect(targetPeer, conn)
      }
    }
  }

  /**
   * Unregister topology.
   * @param {string} id registrar identifier
   * @return {void}
   */
  unregister (id) {
    const topology = this.multicodecTopologies.get(id)

    if (!topology) {
      throw errCode(new Error('no registrar found for the provided id'), 'ERR_NO_REGISTRAR')
    }

    this.multicodecTopologies.delete(id)
  }
}

module.exports = Registrar

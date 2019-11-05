'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')
const errCode = require('err-code')

const { Connection } = require('libp2p-interfaces/src/connection')
const PeerInfo = require('peer-info')
const Toplogy = require('./connection-manager/topology')

/**
 * Responsible for notifying registered protocols of events in the network.
 */
class Registrar {
  /**
   * @param {Object} props
   * @param {PeerStore} props.peerStore
   * @constructor
   */
  constructor ({ peerStore }) {
    this.peerStore = peerStore

    /**
     * Map of connections per peer
     * TODO: this should be handled by connectionManager
     * @type {Map<string, conn>}
     */
    this.connections = new Map()

    /**
     * Map of topologies
     *
     * @type {Map<string, object>}
     */
    this.topologies = new Map()

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

    for (const [, topology] of this.topologies) {
      topology.disconnect(peerInfo, error)
    }

    this.connections.delete(peerInfo.id.toB58String())
  }

  /**
   * Get a connection with a peer.
   * @param {PeerInfo} peerInfo
   * @returns {Connection}
   */
  getConnection (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    return this.connections.get(peerInfo.id.toB58String())
  }

  /**
   * Register handlers for a set of multicodecs given
   * @param {Array<string>|string} multicodecs
   * @param {object} handlers
   * @param {function} handlers.onConnect
   * @param {function} handlers.onDisconnect
   * @param {object} topologyProps properties for topology
   * @return {string} registrar identifier
   */
  register (multicodecs, handlers, topologyProps = {}) {
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
    const topology = new Toplogy({
      onConnect: handlers.onConnect,
      onDisconnect: handlers.onDisconnect,
      registrar: this,
      multicodecs,
      peerStore: this.peerStore,
      ...topologyProps
    })

    const id = (parseInt(Math.random() * 1e9)).toString(36) + Date.now()
    this.topologies.set(id, topology)

    this._addConnectedPeers(multicodecs, topology)

    // TODO: try to connect to peers-store peers according to current topology

    return id
  }

  _addConnectedPeers (multicodecs, topology) {
    const knownPeers = []

    for (const [, peer] of this.peerStore.peers) {
      if (multicodecs.filter(multicodec => peer.protocols.has(multicodec))) {
        knownPeers.push(peer)
      }
    }

    for (const [id, conn] of this.connections.entries()) {
      const targetPeer = knownPeers.find((peerInfo) => peerInfo.id.toB58String() === id)

      if (targetPeer) {
        topology.tryToConnect(targetPeer, conn)
      }
    }
  }

  /**
   * Unregister topology.
   * @param {string} id registrar identifier
   * @return {boolean} unregistered successfully
   */
  unregister (id) {
    return this.topologies.delete(id)
  }
}

module.exports = Registrar

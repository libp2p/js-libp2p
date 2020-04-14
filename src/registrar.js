'use strict'

const debug = require('debug')
const errcode = require('err-code')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')

const PeerId = require('peer-id')

const {
  ERR_INVALID_PARAMETERS
} = require('./errors')
const Topology = require('libp2p-interfaces/src/topology')
const { Connection } = require('libp2p-interfaces/src/connection')

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
    // Used on topology to listen for protocol changes
    this.peerStore = peerStore

    /**
     * Map of connections per peer
     * TODO: this should be handled by connectionManager
     * @type {Map<string, Array<conn>>}
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
   * Cleans up the registrar
   * @async
   */
  async close () {
    // Close all connections we're tracking
    const tasks = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push(connection.close())
      }
    }

    await tasks
    this.connections.clear()
  }

  /**
   * Add a new connected peer to the record
   * TODO: this should live in the ConnectionManager
   * @param {PeerId} peerId
   * @param {Connection} conn
   * @returns {void}
   */
  onConnect (peerId, conn) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!Connection.isConnection(conn)) {
      throw errcode(new Error('conn must be an instance of interface-connection'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const storedConn = this.connections.get(id)

    if (storedConn) {
      storedConn.push(conn)
    } else {
      this.connections.set(id, [conn])
    }
  }

  /**
   * Remove a disconnected peer from the record
   * TODO: this should live in the ConnectionManager
   * @param {PeerId} peerId
   * @param {Connection} connection
   * @param {Error} [error]
   * @returns {void}
   */
  onDisconnect (peerId, connection, error) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    let storedConn = this.connections.get(id)

    if (storedConn && storedConn.length > 1) {
      storedConn = storedConn.filter((conn) => conn.id !== connection.id)
      this.connections.set(id, storedConn)
    } else if (storedConn) {
      for (const [, topology] of this.topologies) {
        topology.disconnect(peerId, error)
      }

      this.connections.delete(id)
    }
  }

  /**
   * Get a connection with a peer.
   * @param {PeerId} peerId
   * @returns {Connection}
   */
  getConnection (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const connections = this.connections.get(peerId.toB58String())
    // Return the first, open connection
    if (connections) {
      return connections.find(connection => connection.stat.status === 'open')
    }
    return null
  }

  /**
   * Register handlers for a set of multicodecs given
   * @param {Topology} topology protocol topology
   * @return {string} registrar identifier
   */
  register (topology) {
    if (!Topology.isTopology(topology)) {
      throw errcode(new Error('topology must be an instance of interfaces/topology'), ERR_INVALID_PARAMETERS)
    }

    // Create topology
    const id = (parseInt(Math.random() * 1e9)).toString(36) + Date.now()

    this.topologies.set(id, topology)

    // Set registrar
    topology.registrar = this

    return id
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

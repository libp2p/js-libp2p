'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:registrar'), {
  error: debug('libp2p:registrar:err')
})
const errcode = require('err-code')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('./errors')
const Topology = require('libp2p-interfaces/src/topology')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('./peer-store/types').PeerStore} PeerStore
 * @typedef {import('./connection-manager')} ConnectionManager
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('./').HandlerProps} HandlerProps
 */

/**
 *
 */

/**
 * Responsible for notifying registered protocols of events in the network.
 */
class Registrar {
  /**
   * @param {Object} props
   * @param {PeerStore} props.peerStore
   * @param {ConnectionManager} props.connectionManager
   * @class
   */
  constructor ({ peerStore, connectionManager }) {
    // Used on topology to listen for protocol changes
    this.peerStore = peerStore

    this.connectionManager = connectionManager

    /**
     * Map of topologies
     *
     * @type {Map<string, Topology>}
     */
    this.topologies = new Map()

    /** @type {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void} */
    // @ts-ignore handle is not optional
    this._handle = undefined

    this._onDisconnect = this._onDisconnect.bind(this)
    this.connectionManager.on('peer:disconnect', this._onDisconnect)
  }

  /**
   * @returns {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void}
   */
  get handle () {
    return this._handle
  }

  /**
   * @param {(protocols: string[]|string, handler: (props: HandlerProps) => void) => void} handle
   */
  set handle (handle) {
    this._handle = handle
  }

  /**
   * Get a connection with a peer.
   *
   * @param {PeerId} peerId
   * @returns {Connection | null}
   */
  getConnection (peerId) {
    return this.connectionManager.get(peerId)
  }

  /**
   * Register handlers for a set of multicodecs given
   *
   * @param {Topology} topology - protocol topology
   * @returns {Promise<string>} registrar identifier
   */
  async register (topology) {
    if (!Topology.isTopology(topology)) {
      log.error('topology must be an instance of interfaces/topology')
      throw errcode(new Error('topology must be an instance of interfaces/topology'), ERR_INVALID_PARAMETERS)
    }

    // Create topology
    const id = (Math.random() * 1e9).toString(36) + Date.now()

    this.topologies.set(id, topology)

    // Set registrar
    await topology.setRegistrar(this)

    return id
  }

  /**
   * Unregister topology.
   *
   * @param {string} id - registrar identifier
   * @returns {boolean} unregistered successfully
   */
  unregister (id) {
    return this.topologies.delete(id)
  }

  /**
   * Remove a disconnected peer from the record
   *
   * @param {Connection} connection
   * @returns {void}
   */
  _onDisconnect (connection) {
    for (const [, topology] of this.topologies) {
      topology.disconnect(connection.remotePeer)
    }
  }
}

module.exports = Registrar

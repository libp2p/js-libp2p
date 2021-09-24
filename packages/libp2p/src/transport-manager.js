'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:transports'), {
  error: debug('libp2p:transports:err')
})

const pSettle = require('p-settle')
const { codes } = require('./errors')
const errCode = require('err-code')

const { updateSelfPeerRecord } = require('./record/utils')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>} TransportFactory
 * @typedef {import('libp2p-interfaces/src/transport/types').Transport<any, any>} Transport
 *
 * @typedef {Object} TransportManagerProperties
 * @property {import('./')} libp2p
 * @property {import('./upgrader')} upgrader
 *
 * @typedef {Object} TransportManagerOptions
 * @property {number} [faultTolerance = FAULT_TOLERANCE.FATAL_ALL] - Address listen error tolerance.
 */

class TransportManager {
  /**
   * @class
   * @param {TransportManagerProperties & TransportManagerOptions} options
   */
  constructor ({ libp2p, upgrader, faultTolerance = FAULT_TOLERANCE.FATAL_ALL }) {
    this.libp2p = libp2p
    this.upgrader = upgrader
    /** @type {Map<string, Transport>} */
    this._transports = new Map()
    this._listeners = new Map()
    this._listenerOptions = new Map()
    this.faultTolerance = faultTolerance
  }

  /**
   * Adds a `Transport` to the manager
   *
   * @param {string} key
   * @param {TransportFactory} Transport
   * @param {*} transportOptions - Additional options to pass to the transport
   * @returns {void}
   */
  add (key, Transport, transportOptions = {}) {
    log('adding %s', key)
    if (!key) {
      throw errCode(new Error(`Transport must have a valid key, was given '${key}'`), codes.ERR_INVALID_KEY)
    }
    if (this._transports.has(key)) {
      throw errCode(new Error('There is already a transport with this key'), codes.ERR_DUPLICATE_TRANSPORT)
    }

    const transport = new Transport({
      ...transportOptions,
      libp2p: this.libp2p,
      upgrader: this.upgrader
    })

    this._transports.set(key, transport)
    this._listenerOptions.set(key, transportOptions.listenerOptions || {})
    if (!this._listeners.has(key)) {
      this._listeners.set(key, [])
    }
  }

  /**
   * Stops all listeners
   *
   * @async
   */
  async close () {
    const tasks = []
    for (const [key, listeners] of this._listeners) {
      log('closing listeners for %s', key)
      while (listeners.length) {
        const listener = listeners.pop()
        listener.removeAllListeners('listening')
        listener.removeAllListeners('close')
        tasks.push(listener.close())
      }
    }

    await Promise.all(tasks)
    log('all listeners closed')
    for (const key of this._listeners.keys()) {
      this._listeners.set(key, [])
    }
  }

  /**
   * Dials the given Multiaddr over it's supported transport
   *
   * @param {Multiaddr} ma
   * @param {*} options
   * @returns {Promise<Connection>}
   */
  async dial (ma, options) {
    const transport = this.transportForMultiaddr(ma)
    if (!transport) {
      throw errCode(new Error(`No transport available for address ${String(ma)}`), codes.ERR_TRANSPORT_UNAVAILABLE)
    }

    try {
      return await transport.dial(ma, options)
    } catch (err) {
      if (!err.code) err.code = codes.ERR_TRANSPORT_DIAL_FAILED
      throw err
    }
  }

  /**
   * Returns all Multiaddr's the listeners are using
   *
   * @returns {Multiaddr[]}
   */
  getAddrs () {
    /** @type {Multiaddr[]} */
    let addrs = []
    for (const listeners of this._listeners.values()) {
      for (const listener of listeners) {
        addrs = [...addrs, ...listener.getAddrs()]
      }
    }
    return addrs
  }

  /**
   * Returns all the transports instances.
   *
   * @returns {IterableIterator<Transport>}
   */
  getTransports () {
    return this._transports.values()
  }

  /**
   * Finds a transport that matches the given Multiaddr
   *
   * @param {Multiaddr} ma
   * @returns {Transport|null}
   */
  transportForMultiaddr (ma) {
    for (const transport of this._transports.values()) {
      const addrs = transport.filter([ma])
      if (addrs.length) return transport
    }
    return null
  }

  /**
   * Starts listeners for each listen Multiaddr.
   *
   * @async
   * @param {Multiaddr[]} addrs - addresses to attempt to listen on
   */
  async listen (addrs) {
    if (!addrs || addrs.length === 0) {
      log('no addresses were provided for listening, this node is dial only')
      return
    }

    const couldNotListen = []
    for (const [key, transport] of this._transports.entries()) {
      const supportedAddrs = transport.filter(addrs)
      const tasks = []

      // For each supported multiaddr, create a listener
      for (const addr of supportedAddrs) {
        log('creating listener for %s on %s', key, addr)
        const listener = transport.createListener(this._listenerOptions.get(key))
        this._listeners.get(key).push(listener)

        // Track listen/close events
        listener.on('listening', () => updateSelfPeerRecord(this.libp2p))
        listener.on('close', () => updateSelfPeerRecord(this.libp2p))

        // We need to attempt to listen on everything
        tasks.push(listener.listen(addr))
      }

      // Keep track of transports we had no addresses for
      if (tasks.length === 0) {
        couldNotListen.push(key)
        continue
      }

      const results = await pSettle(tasks)
      // If we are listening on at least 1 address, succeed.
      // TODO: we should look at adding a retry (`p-retry`) here to better support
      // listening on remote addresses as they may be offline. We could then potentially
      // just wait for any (`p-any`) listener to succeed on each transport before returning
      const isListening = results.find(r => r.isFulfilled === true)
      if (!isListening && this.faultTolerance !== FAULT_TOLERANCE.NO_FATAL) {
        throw errCode(new Error(`Transport (${key}) could not listen on any available address`), codes.ERR_NO_VALID_ADDRESSES)
      }
    }

    // If no transports were able to listen, throw an error. This likely
    // means we were given addresses we do not have transports for
    if (couldNotListen.length === this._transports.size) {
      const message = `no valid addresses were provided for transports [${couldNotListen}]`
      if (this.faultTolerance === FAULT_TOLERANCE.FATAL_ALL) {
        throw errCode(new Error(message), codes.ERR_NO_VALID_ADDRESSES)
      }
      log(`libp2p in dial mode only: ${message}`)
    }
  }

  /**
   * Removes the given transport from the manager.
   * If a transport has any running listeners, they will be closed.
   *
   * @async
   * @param {string} key
   */
  async remove (key) {
    log('removing %s', key)
    if (this._listeners.has(key)) {
      // Close any running listeners
      for (const listener of this._listeners.get(key)) {
        listener.removeAllListeners('listening')
        listener.removeAllListeners('close')
        await listener.close()
      }
    }

    this._transports.delete(key)
    this._listeners.delete(key)
  }

  /**
   * Removes all transports from the manager.
   * If any listeners are running, they will be closed.
   *
   * @async
   */
  async removeAll () {
    const tasks = []
    for (const key of this._transports.keys()) {
      tasks.push(this.remove(key))
    }

    await Promise.all(tasks)
  }
}

/**
 * Enum Transport Manager Fault Tolerance values.
 * FATAL_ALL should be used for failing in any listen circumstance.
 * NO_FATAL should be used for not failing when not listening.
 *
 * @readonly
 * @enum {number}
 */
const FAULT_TOLERANCE = {
  FATAL_ALL: 0,
  NO_FATAL: 1
}

TransportManager.FaultTolerance = FAULT_TOLERANCE

module.exports = TransportManager

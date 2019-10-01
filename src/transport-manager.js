'use strict'

const pSettle = require('p-settle')
const { codes } = require('./errors')
const errCode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:transports')
log.error = debug('error:libp2p:transports')

class TransportManager {
  /**
   * @constructor
   * @param {object} options
   * @param {Libp2p} options.libp2p The Libp2p instance. It will be passed to the transports.
   * @param {Upgrader} options.upgrader The upgrader to provide to the transports
   * @param {function(Connection)} options.onConnection Called whenever an incoming connection is received
   */
  constructor ({ libp2p, upgrader, onConnection }) {
    this.libp2p = libp2p
    this.upgrader = upgrader
    this._transports = new Map()
    this._listeners = new Map()
    this.onConnection = onConnection
  }

  /**
   * Adds a `Transport` to the manager
   *
   * @param {String} key
   * @param {Transport} Transport
   * @returns {void}
   */
  add (key, Transport) {
    log('adding %s', key)
    if (!key) {
      throw errCode(new Error(`Transport must have a valid key, was given '${key}'`), codes.ERR_INVALID_KEY)
    }
    if (this._transports.has(key)) {
      throw errCode(new Error('There is already a transport with this key'), codes.ERR_DUPLICATE_TRANSPORT)
    }

    const transport = new Transport({
      libp2p: this.libp2p,
      upgrader: this.upgrader
    })

    this._transports.set(key, transport)
    this._listeners.set(key, [])
  }

  /**
   * Stops all listeners
   * @async
   */
  async close () {
    const tasks = []
    for (const [key, listeners] of this._listeners) {
      log('closing listeners for %s', key)
      while (listeners.length) {
        tasks.push(listeners.pop().close())
      }
    }

    await Promise.all(tasks)
    this._listeners.clear()
  }

  /**
   * Dials the given Multiaddr over it's supported transport
   * @param {Multiaddr} ma
   * @param {*} options
   * @returns {Promise<Connection>}
   */
  async dial (ma, options) {
    const transport = this.transportForMultiaddr(ma)
    if (!transport) {
      throw errCode(new Error(`No transport available for address ${String(ma)}`), codes.ERR_TRANSPORT_UNAVAILABLE)
    }
    const conn = await transport.dial(ma, options)
    return conn
  }

  /**
   * Returns all Multiaddr's the listeners are using
   * @returns {Multiaddr[]}
   */
  getAddrs () {
    let addrs = []
    for (const listeners of this._listeners.values()) {
      for (const listener of listeners) {
        addrs = [...addrs, ...listener.getAddrs()]
      }
    }
    return addrs
  }

  /**
   * Finds a transport that matches the given Multiaddr
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
   * Starts listeners for each given Multiaddr.
   * @async
   * @param {Multiaddr[]} addrs
   */
  async listen (addrs) {
    for (const [key, transport] of this._transports.entries()) {
      const supportedAddrs = transport.filter(addrs)
      const tasks = []

      // For each supported multiaddr, create a listener
      for (const addr of supportedAddrs) {
        log('creating listener for %s on %s', key, addr)
        const listener = transport.createListener({}, this.onConnection)
        this._listeners.get(key).push(listener)

        // We need to attempt to listen on everything
        tasks.push(listener.listen(addr))
      }

      const results = await pSettle(tasks)
      // If we are listening on at least 1 address, succeed.
      // TODO: we should look at adding a retry (`p-retry`) here to better support
      // listening on remote addresses as they may be offline. We could then potentially
      // just wait for any (`p-any`) listener to succeed on each transport before returning
      const isListening = results.find(r => r.isFulfilled === true)
      if (!isListening) {
        throw errCode(new Error(`Transport (${key}) could not listen on any available address`), codes.ERR_NO_VALID_ADDRESSES)
      }
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
        await listener.close()
      }
    }

    this._transports.delete(key)
    this._listeners.delete(key)
  }

  /**
   * Removes all transports from the manager.
   * If any listeners are running, they will be closed.
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

module.exports = TransportManager

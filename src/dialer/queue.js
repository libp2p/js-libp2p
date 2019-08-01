'use strict'

const ConnectionFSM = require('../connection')
const { DIAL_ABORTED, ERR_DENIED } = require('../errors')
const nextTick = require('async/nextTick')
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:switch:dial')
log.error = debug('libp2p:switch:dial:error')

/**
 * Components required to execute a dial
 * @typedef {Object} DialRequest
 * @property {PeerInfo} peerInfo - The peer to dial to
 * @property {string} [protocol] - The protocol to create a stream for
 * @property {object} options
 * @property {boolean} options.useFSM - If `callback` should return a ConnectionFSM
 * @property {number} options.priority - The priority of the dial
 * @property {function(Error, Connection|ConnectionFSM)} callback
 */

/**
 * @typedef {Object} NewConnection
 * @property {ConnectionFSM} connectionFSM
 * @property {boolean} didCreate
 */

/**
 * Attempts to create a new connection or stream (when muxed),
 * via negotiation of the given `protocol`. If no `protocol` is
 * provided, no action will be taken and `callback` will be called
 * immediately with no error or values.
 *
 * @param {object} options
 * @param {string} options.protocol
 * @param {ConnectionFSM} options.connection
 * @param {function(Error, Connection)} options.callback
 * @returns {void}
 */
function createConnectionWithProtocol ({ protocol, connection, callback }) {
  if (!protocol) {
    return callback()
  }
  connection.shake(protocol, (err, conn) => {
    if (!conn) {
      return callback(err)
    }

    conn.setPeerInfo(connection.theirPeerInfo)
    callback(null, conn)
  })
}

/**
 * A convenience array wrapper for controlling
 * a per peer queue
 *
 * @returns {Queue}
 */
class Queue {
  /**
   * @constructor
   * @param {string} peerId
   * @param {Switch} _switch
   * @param {function(string)} onStopped Called when the queue stops
   */
  constructor (peerId, _switch, onStopped) {
    this.id = peerId
    this.switch = _switch
    this._queue = []
    this.denylisted = null
    this.denylistCount = 0
    this.isRunning = false
    this.onStopped = onStopped
  }

  get length () {
    return this._queue.length
  }

  /**
   * Adds the dial request to the queue. The queue is not automatically started
   * @param {string} protocol
   * @param {boolean} useFSM If callback should use a ConnectionFSM instead
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  add (protocol, useFSM, callback) {
    if (!this.isDialAllowed()) {
      return nextTick(callback, ERR_DENIED())
    }
    this._queue.push({ protocol, useFSM, callback })
  }

  /**
   * Determines whether or not dialing is currently allowed
   * @returns {boolean}
   */
  isDialAllowed () {
    if (this.denylisted) {
      // If the deny ttl has passed, reset it
      if (Date.now() > this.denylisted) {
        this.denylisted = null
        return true
      }
      // Dial is not allowed
      return false
    }
    return true
  }

  /**
   * Starts the queue. If the queue was started `true` will be returned.
   * If the queue was already running `false` is returned.
   * @returns {boolean}
   */
  start () {
    if (!this.isRunning) {
      log('starting dial queue to %s', this.id)
      this.isRunning = true
      this._run()
      return true
    }
    return false
  }

  /**
   * Stops the queue
   */
  stop () {
    if (this.isRunning) {
      log('stopping dial queue to %s', this.id)
      this.isRunning = false
      this.onStopped(this.id)
    }
  }

  /**
   * Stops the queue and errors the callback for each dial request
   */
  abort () {
    while (this.length > 0) {
      const dial = this._queue.shift()
      dial.callback(DIAL_ABORTED())
    }
    this.stop()
  }

  /**
   * Marks the queue as denylisted. The queue will be immediately aborted.
   * @returns {void}
   */
  denylist () {
    this.denylistCount++

    if (this.denylistCount >= this.switch.dialer.DENY_ATTEMPTS) {
      this.denylisted = Infinity
      return
    }

    let ttl = this.switch.dialer.DENY_TTL * Math.pow(this.denylistCount, 3)
    const minTTL = ttl * 0.9
    const maxTTL = ttl * 1.1

    // Add a random jitter of 20% to the ttl
    ttl = Math.floor(Math.random() * (maxTTL - minTTL) + minTTL)

    this.denylisted = Date.now() + ttl
    this.abort()
  }

  /**
   * Attempts to find a muxed connection for the given peer. If one
   * isn't found, a new one will be created.
   *
   * Returns an array containing two items. The ConnectionFSM and wether
   * or not the ConnectionFSM was just created. The latter can be used
   * to determine dialing needs.
   *
   * @private
   * @param {PeerInfo} peerInfo
   * @returns {NewConnection}
   */
  _getOrCreateConnection (peerInfo) {
    let connectionFSM = this.switch.connection.getOne(this.id)
    let didCreate = false

    if (!connectionFSM) {
      connectionFSM = new ConnectionFSM({
        _switch: this.switch,
        peerInfo,
        muxer: null,
        conn: null
      })

      this.switch.connection.add(connectionFSM)

      // Add control events and start the dialer
      connectionFSM.once('connected', () => connectionFSM.protect())
      connectionFSM.once('private', () => connectionFSM.encrypt())
      connectionFSM.once('encrypted', () => connectionFSM.upgrade())

      didCreate = true
    }

    return { connectionFSM, didCreate }
  }

  /**
   * Executes the next dial in the queue for the given peer
   * @private
   * @returns {void}
   */
  _run () {
    // If we have no items in the queue or we're stopped, exit
    if (this.length < 1 || !this.isRunning) {
      log('stopping the queue for %s', this.id)
      return this.stop()
    }

    const next = once(() => {
      log('starting next dial to %s', this.id)
      this._run()
    })

    const peerInfo = this.switch._peerBook.get(this.id)
    const queuedDial = this._queue.shift()
    const { connectionFSM, didCreate } = this._getOrCreateConnection(peerInfo)

    // If the dial expects a ConnectionFSM, we can provide that back now
    if (queuedDial.useFSM) {
      nextTick(queuedDial.callback, null, connectionFSM)
    }

    // If we can handshake protocols, get a new stream and call run again
    if (['MUXED', 'CONNECTED'].includes(connectionFSM.getState())) {
      queuedDial.connection = connectionFSM
      createConnectionWithProtocol(queuedDial)
      next()
      return
    }

    // If we error, error the queued dial
    // In the future, it may be desired to error the other queued dials,
    // depending on the error.
    connectionFSM.once('error', (err) => {
      queuedDial.callback(err)
      // Dont denylist peers we have identified and that we are connected to
      if (peerInfo.protocols.size > 0 && peerInfo.isConnected()) {
        return
      }
      this.denylist()
    })

    connectionFSM.once('close', () => {
      next()
    })

    // If we're not muxed yet, add listeners
    connectionFSM.once('muxed', () => {
      this.denylistCount = 0 // reset denylisting on good connections
      queuedDial.connection = connectionFSM
      createConnectionWithProtocol(queuedDial)
      next()
    })

    connectionFSM.once('unmuxed', () => {
      this.denylistCount = 0
      queuedDial.connection = connectionFSM
      createConnectionWithProtocol(queuedDial)
      next()
    })

    // If we have a new connection, start dialing
    if (didCreate) {
      connectionFSM.dial()
    }
  }
}

module.exports = Queue

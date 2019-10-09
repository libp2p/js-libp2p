'use strict'

const FSM = require('fsm-event')
const EventEmitter = require('events').EventEmitter
const each = require('async/each')
const eachSeries = require('async/eachSeries')
const series = require('async/series')
const Circuit = require('../circuit')
const TransportManager = require('./transport')
const ConnectionManager = require('./connection/manager')
const { getPeerInfo } = require('../get-peer-info')
const getDialer = require('./dialer')
const connectionHandler = require('./connection/handler')
const ProtocolMuxer = require('./protocol-muxer')
const plaintext = require('./plaintext')
const Observer = require('./observer')
const Stats = require('./stats')
const assert = require('assert')
const Errors = require('./errors')
const debug = require('debug')
const log = debug('libp2p:switch')
log.error = debug('libp2p:switch:error')

/**
 * @fires Switch#stop Triggered when the switch has stopped
 * @fires Switch#start Triggered when the switch has started
 * @fires Switch#error Triggered whenever an error occurs
 */
class Switch extends EventEmitter {
  constructor (peerInfo, peerBook, options) {
    super()
    assert(peerInfo, 'You must provide a `peerInfo`')
    assert(peerBook, 'You must provide a `peerBook`')

    this._peerInfo = peerInfo
    this._peerBook = peerBook
    this._options = options || {}

    this.setMaxListeners(Infinity)
    // transports --
    // { key: transport }; e.g { tcp: <tcp> }
    this.transports = {}

    // connections --
    // { peerIdB58: { conn: <conn> }}
    this.conns = {}

    // { protocol: handler }
    this.protocols = {}

    // { muxerCodec: <muxer> } e.g { '/spdy/0.3.1': spdy }
    this.muxers = {}

    // is the Identify protocol enabled?
    this.identify = false

    // Crypto details
    this.crypto = plaintext

    this.protector = this._options.protector || null

    this.transport = new TransportManager(this)
    this.connection = new ConnectionManager(this)

    this.observer = Observer(this)
    this.stats = Stats(this.observer, this._options.stats)
    this.protocolMuxer = ProtocolMuxer(this.protocols, this.observer)

    // All purpose connection handler for managing incoming connections
    this._connectionHandler = connectionHandler(this)

    // Setup the internal state
    this.state = new FSM('STOPPED', {
      STOPPED: {
        start: 'STARTING',
        stop: 'STOPPING' // ensures that any transports that were manually started are stopped
      },
      STARTING: {
        done: 'STARTED',
        stop: 'STOPPING'
      },
      STARTED: {
        stop: 'STOPPING',
        start: 'STARTED'
      },
      STOPPING: {
        stop: 'STOPPING',
        done: 'STOPPED'
      }
    })
    this.state.on('STARTING', () => {
      log('The switch is starting')
      this._onStarting()
    })
    this.state.on('STOPPING', () => {
      log('The switch is stopping')
      this._onStopping()
    })
    this.state.on('STARTED', () => {
      log('The switch has started')
      this.emit('start')
    })
    this.state.on('STOPPED', () => {
      log('The switch has stopped')
      this.emit('stop')
    })
    this.state.on('error', (err) => {
      log.error(err)
      this.emit('error', err)
    })

    // higher level (public) API
    this.dialer = getDialer(this)
    this.dial = this.dialer.dial
    this.dialFSM = this.dialer.dialFSM
  }

  /**
   * Returns a list of the transports peerInfo has addresses for
   *
   * @param {PeerInfo} peerInfo
   * @returns {Array<Transport>}
   */
  availableTransports (peerInfo) {
    const myAddrs = peerInfo.multiaddrs.toArray()
    const myTransports = Object.keys(this.transports)

    // Only listen on transports we actually have addresses for
    return myTransports.filter((ts) => this.transports[ts].filter(myAddrs).length > 0)
      // push Circuit to be the last proto to be dialed, and alphabetize the others
      .sort((a, b) => {
        if (a === Circuit.tag) return 1
        if (b === Circuit.tag) return -1
        return a < b ? -1 : 1
      })
  }

  /**
   * Adds the `handlerFunc` and `matchFunc` to the Switch's protocol
   * handler list for the given `protocol`. If the `matchFunc` returns
   * true for a protocol check, the `handlerFunc` will be called.
   *
   * @param {string} protocol
   * @param {function(string, Connection)} handlerFunc
   * @param {function(string, string, function(Error, boolean))} matchFunc
   * @returns {void}
   */
  handle (protocol, handlerFunc, matchFunc) {
    this.protocols[protocol] = {
      handlerFunc: handlerFunc,
      matchFunc: matchFunc
    }
    this._peerInfo.protocols.add(protocol)
  }

  /**
   * Removes the given protocol from the Switch's protocol list
   *
   * @param {string} protocol
   * @returns {void}
   */
  unhandle (protocol) {
    if (this.protocols[protocol]) {
      delete this.protocols[protocol]
    }
    this._peerInfo.protocols.delete(protocol)
  }

  /**
   * If a muxed Connection exists for the given peer, it will be closed
   * and its reference on the Switch will be removed.
   *
   * @param {PeerInfo|Multiaddr|PeerId} peer
   * @param {function()} callback
   * @returns {void}
   */
  hangUp (peer, callback) {
    const peerInfo = getPeerInfo(peer, this._peerBook)
    const key = peerInfo.id.toB58String()
    const conns = [...this.connection.getAllById(key)]
    each(conns, (conn, cb) => {
      conn.once('close', cb)
      conn.close()
    }, callback)
  }

  /**
   * Returns whether or not the switch has any transports
   *
   * @returns {boolean}
   */
  hasTransports () {
    const transports = Object.keys(this.transports).filter((t) => t !== Circuit.tag)
    return transports && transports.length > 0
  }

  /**
   * Issues a start on the Switch state.
   *
   * @param {function} callback deprecated: Listening for the `error` and `start` events are recommended
   * @returns {void}
   */
  start (callback = () => {}) {
    // Add once listener for deprecated callback support
    this.once('start', callback)

    this.state('start')
  }

  /**
   * Issues a stop on the Switch state.
   *
   * @param {function} callback deprecated: Listening for the `error` and `stop` events are recommended
   * @returns {void}
   */
  stop (callback = () => {}) {
    // Add once listener for deprecated callback support
    this.once('stop', callback)

    this.state('stop')
  }

  /**
   * A listener that will start any necessary services and listeners
   *
   * @private
   * @returns {void}
   */
  _onStarting () {
    this.stats.start()
    eachSeries(this.availableTransports(this._peerInfo), (ts, cb) => {
      // Listen on the given transport
      this.transport.listen(ts, {}, null, cb)
    }, (err) => {
      if (err) {
        log.error(err)
        this.emit('error', err)
        return this.state('stop')
      }
      this.state('done')
    })
  }

  /**
   * A listener that will turn off all running services and listeners
   *
   * @private
   * @returns {void}
   */
  _onStopping () {
    this.stats.stop()
    series([
      (cb) => {
        each(this.transports, (transport, cb) => {
          each(transport.listeners, (listener, cb) => {
            listener.close((err) => {
              if (err) log.error(err)
              cb()
            })
          }, cb)
        }, cb)
      },
      (cb) => each(this.connection.getAll(), (conn, cb) => {
        conn.once('close', cb)
        conn.close()
      }, cb)
    ], (_) => {
      this.state('done')
    })
  }
}

module.exports = Switch
module.exports.errors = Errors

'use strict'

const multistream = require('multistream-select')
const Connection = require('interface-connection').Connection
const setImmediate = require('async/setImmediate')
const Circuit = require('libp2p-circuit')
const waterfall = require('async/waterfall')

const debug = require('debug')
const log = debug('libp2p:switch:dial')

const getPeerInfo = require('./get-peer-info')
const observeConnection = require('./observe-connection')

/**
 * Manages dialing to another peer, including muxer upgrades
 * and crypto management. The main entry point for dialing is
 * Dialer.dial
 *
 * @param {Switch} _switch
 * @param {PeerInfo} peerInfo
 * @param {string} protocol
 * @param {function(Error, Connection)} callback
 */
class Dialer {
  constructor (_switch, peerInfo, ourPeerInfo, protocol, callback) {
    this.switch = _switch
    this.peerInfo = peerInfo
    this.ourPeerInfo = ourPeerInfo
    this.protocol = protocol
    this.callback = callback
  }

  /**
   * Initializes a proxy connection and returns it. The connection is also immediately
   * dialed. This will include establishing the base connection, crypto, muxing and the
   * protocol handshake if all needed components have already been set.
   *
   * @returns {Connection}
   */
  dial () {
    const proxyConnection = new Connection()
    proxyConnection.setPeerInfo(this.peerInfo)

    waterfall([
      (cb) => {
        this._establishConnection(cb)
      },
      (connection, cb) => {
        if (connection) {
          proxyConnection.setPeerInfo(this.peerInfo)
          proxyConnection.setInnerConn(connection)
          return cb(null, proxyConnection)
        }
        cb(null)
      }
    ], (err, connection) => {
      this.callback(err, connection)
    })

    return proxyConnection
  }

  /**
   * Establishes a base connection and then continues to upgrade that connection
   * including: crypto, muxing and the protocol handshake. If any upgrade is not
   * yet available, or already exists, the upgrade will continue where it left off.
   *
   * @private
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _establishConnection (callback) {
    const b58Id = this.peerInfo.id.toB58String()
    log('dialing %s', b58Id)
    if (b58Id === this.ourPeerInfo.id.toB58String()) {
      return callback(new Error('A node cannot dial itself'))
    }

    waterfall([
      (cb) => {
        // Start with a base connection, which includes encryption
        this._createBaseConnection(b58Id, cb)
      },
      (baseConnection, cb) => {
        // Upgrade the connection with a muxer
        this._createMuxedConnection(baseConnection, b58Id, cb)
      },
      (muxer, cb) => {
        // If we have no protocol, dont continue with the handshake
        if (!this.protocol) {
          return cb()
        }
        // If we have a muxer, create a new stream, otherwise it's a standard connection
        const connection = muxer.newStream ? muxer.newStream() : muxer
        this._performProtocolHandshake(connection, cb)
      }
    ], (err, connection) => {
      callback(err, connection)
    })
  }

  /**
   * If the base connection already exists to the PeerId key, `b58Id`,
   * it will be returned in the callback. If no connection exists, one will
   * be attempted via Dialer.attemptDial.
   *
   * @private
   * @param {string} b58Id
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _createBaseConnection (b58Id, callback) {
    const baseConnection = this.switch.conns[b58Id]
    const muxedConnection = this.switch.muxedConns[b58Id]

    // if the muxed connection exists, dont return a connection,
    // _createMuxedConnection will get the connection
    if (muxedConnection) {
      return callback(null, null)
    }
    if (baseConnection) {
      this.switch.conns[b58Id] = undefined
      return callback(null, baseConnection)
    }

    waterfall([
      (cb) => {
        this._attemptDial(cb)
      },
      (baseConnection, cb) => {
        // Add the Switch's crypt encryption to the connection
        this._encryptConnection(baseConnection, cb)
      }
    ], (err, encryptedConnection) => {
      if (err) {
        return callback(err)
      }

      callback(null, encryptedConnection)
    })
  }

  /**
   * If the given PeerId key, `b58Id`, has an existing muxed connection
   * it will be returned via the callback, otherwise the connection
   * upgrade will be initiated via Dialer.attemptMuxerUpgrade.
   *
   * @private
   * @param {Connection} connection
   * @param {string} b58Id
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _createMuxedConnection (connection, b58Id, callback) {
    const muxedConnection = this.switch.muxedConns[b58Id]
    if (muxedConnection) {
      return callback(null, muxedConnection.muxer)
    }

    connection.setPeerInfo(this.peerInfo)
    this._attemptMuxerUpgrade(connection, b58Id, (err, muxer) => {
      // The underlying stream closed unexpectedly, so drop the connection.
      // Fixes https://github.com/libp2p/js-libp2p-switch/issues/235
      if (err && err.message === 'Unexpected end of input from reader.') {
        log('Connection dropped for %s', b58Id)
        return callback(null, null)
      }

      if (err && !this.protocol) {
        this.switch.conns[b58Id] = connection
        return callback(null, null)
      }

      if (err) {
        // couldn't upgrade to Muxer, it is ok, use the existing connection
        return callback(null, connection)
      }

      callback(null, muxer)
    })
  }

  /**
   * Iterates over each Muxer on the Switch and attempts to upgrade
   * the given `connection`. Successful muxed connections will be stored
   * on the Switch.muxedConns with `b58Id` as their key for future reference.
   *
   * @private
   * @param {Connection} connection
   * @param {string} b58Id
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _attemptMuxerUpgrade (connection, b58Id, callback) {
    const muxers = Object.keys(this.switch.muxers)
    if (muxers.length === 0) {
      return callback(new Error('no muxers available'))
    }

    // 1. try to handshake in one of the muxers available
    // 2. if succeeds
    //  - add the muxedConn to the list of muxedConns
    //  - add incomming new streams to connHandler
    const nextMuxer = (key) => {
      log('selecting %s', key)
      msDialer.select(key, (err, conn) => {
        if (err) {
          if (muxers.length === 0) {
            return callback(new Error('could not upgrade to stream muxing'))
          }

          return nextMuxer(muxers.shift())
        }

        const muxedConn = this.switch.muxers[key].dialer(conn)
        this.switch.muxedConns[b58Id] = {}
        this.switch.muxedConns[b58Id].muxer = muxedConn

        muxedConn.once('close', () => {
          delete this.switch.muxedConns[b58Id]
          this.peerInfo.disconnect()
          this.switch._peerInfo.disconnect()
          setImmediate(() => this.switch.emit('peer-mux-closed', this.peerInfo))
        })

        // For incoming streams, in case identify is on
        muxedConn.on('stream', (conn) => {
          conn.setPeerInfo(this.peerInfo)
          this.switch.protocolMuxer(null)(conn)
        })

        setImmediate(() => this.switch.emit('peer-mux-established', this.peerInfo))

        callback(null, muxedConn)
      })
    }

    const msDialer = new multistream.Dialer()
    msDialer.handle(connection, (err) => {
      if (err) {
        // Repackage errors from pull-streams ending unexpectedly.
        // Needed until https://github.com/dignifiedquire/pull-length-prefixed/pull/8 is merged.
        if (err === true) {
          return callback(new Error('Unexpected end of input from reader.'))
        }
        return callback(new Error('multistream not supported'))
      }

      nextMuxer(muxers.shift())
    })
  }

  /**
   * Iterates over each Transport on the Switch and attempts to connect
   * to the peer. Once a Transport succeeds, no additional Transports will
   * be dialed.
   *
   * @private
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _attemptDial (callback) {
    if (!this.switch.hasTransports()) {
      return callback(new Error('No transports registered, dial not possible'))
    }

    const tKeys = this.switch.availableTransports(this.peerInfo)

    const circuitEnabled = Boolean(this.switch.transports[Circuit.tag])
    let circuitTried = false

    const nextTransport = (key) => {
      let transport = key
      const b58Id = this.peerInfo.id.toB58String()
      if (!transport) {
        if (!circuitEnabled) {
          const msg = `Circuit not enabled and all transports failed to dial peer ${b58Id}!`
          return callback(new Error(msg))
        }

        if (circuitTried) {
          return callback(new Error(`No available transports to dial peer ${b58Id}!`))
        }

        log(`Falling back to dialing over circuit`)
        this.peerInfo.multiaddrs.add(`/p2p-circuit/ipfs/${b58Id}`)
        circuitTried = true
        transport = Circuit.tag
      }

      log(`dialing transport ${transport}`)
      this.switch.transport.dial(transport, this.peerInfo, (err, _conn) => {
        if (err) {
          log(err)
          return nextTransport(tKeys.shift())
        }

        const conn = observeConnection(transport, null, _conn, this.switch.observer)
        callback(null, conn)
      })
    }

    nextTransport(tKeys.shift())
  }

  /**
   * Attempts to encrypt the given `connection` with the Switch's crypto.
   *
   * @private
   * @param {Connection} connection
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _encryptConnection (connection, callback) {
    const msDialer = new multistream.Dialer()

    msDialer.handle(connection, (err) => {
      if (err) {
        return callback(err)
      }

      const myId = this.switch._peerInfo.id
      log('selecting crypto: %s', this.switch.crypto.tag)

      msDialer.select(this.switch.crypto.tag, (err, _conn) => {
        if (err) {
          return callback(err)
        }

        const conn = observeConnection(null, this.switch.crypto.tag, _conn, this.switch.observer)

        const encryptedConnection = this.switch.crypto.encrypt(myId, conn, this.peerInfo.id, (err) => {
          if (err) {
            return callback(err)
          }

          encryptedConnection.setPeerInfo(this.peerInfo)
          callback(null, encryptedConnection)
        })
      })
    })
  }

  /**
   * Initiates a handshake for the Dialer's set protocol
   *
   * @private
   * @param {Connection} connection
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  _performProtocolHandshake (connection, callback) {
    // If there is no protocol set yet, don't perform the handshake
    if (!this.protocol) {
      callback()
    }

    const msDialer = new multistream.Dialer()
    msDialer.handle(connection, (err) => {
      if (err) {
        return callback(err)
      }
      msDialer.select(this.protocol, (err, conn) => {
        if (err) {
          return callback(err)
        }
        callback(null, conn)
      })
    })
  }
}

/**
 * Returns a Dialer generator that when called, will immediately begin dialing
 * fo the given `peer`.
 *
 * @param {Switch} _switch
 * @returns {function(PeerInfo, string, function(Error, Connection))}
 */
function dial (_switch) {
  /**
   * Creates a new dialer and immediately begins dialing to the given `peer`
   *
   * @param {PeerInfo} peer
   * @param {string} protocol
   * @param {function(Error, Connection)} callback
   * @returns {Connection}
   */
  return (peer, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = callback || function noop () {}

    const peerInfo = getPeerInfo(peer, _switch._peerBook)
    const dialer = new Dialer(_switch, peerInfo, _switch._peerInfo, protocol, callback)

    return dialer.dial()
  }
}

module.exports = dial

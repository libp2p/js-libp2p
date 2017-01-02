'use strict'

const pull = require('pull-stream')
const timeout = require('async/timeout')
const lp = require('pull-length-prefixed')
const setImmediate = require('async/setImmediate')

const rpc = require('./rpc')
const c = require('./constants')
const Message = require('./message')
const utils = require('./utils')

/**
 * Handle network operations for the dht
 */
class Network {
  /**
   * Create a new network.
   *
   * @param {DHT} dht
   * @param {Libp2p} libp2p
   */
  constructor (dht, libp2p) {
    this.dht = dht
    this.libp2p = libp2p
    this.readMessageTimeout = c.READ_MESSAGE_TIMEOUT
    this._log = utils.logger(this.dht.self.id, 'net')
    this._rpc = rpc(this.dht)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._online = false
  }

  /**
   * Start the network.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  start (callback) {
    const cb = (err) => setImmediate(() => callback(err))

    if (this.isOnline) {
      return cb(new Error('Network is already running'))
    }

    if (!this.dht.isRunning || !this.dht.libp2p.isOnline) {
      return cb(new Error('Can not start network'))
    }

    this._online = true

    // handle incoming connections
    this.libp2p.swarm.handle(c.PROTOCOL_DHT, this._rpc)

    // handle new connections
    this.libp2p.on('peer:connect', this._onPeerConnected)

    cb()
  }

  /**
   * Stop all network activity.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  stop (callback) {
    const cb = (err) => setImmediate(() => callback(err))

    if (!this.isOnline) {
      return cb(new Error('Network is already stopped'))
    }
    this._online = false
    this.libp2p.removeListener('peer:connect', this._onPeerConnected)

    this.libp2p.swarm.unhandle(c.PROTOCOL_DHT)
    cb()
  }

  /**
   * Is the network online?
   *
   * @type {bool}
   */
  get isOnline () {
    return this._online
  }

  /**
   * Are all network components there?
   *
   * @type {bool}
   */
  get isConnected () {
    return this.dht.libp2p.isOnline && this.dht.isRunning && this.isOnline
  }

  /**
   * Handle new connections in the swarm.
   *
   * @param {PeerInfo} peer
   * @returns {void}
   * @private
   */
  _onPeerConnected (peer) {
    if (!this.isConnected) {
      return this._log.error('Network is offline')
    }

    this.libp2p.dial(peer, c.PROTOCOL_DHT, (err, conn) => {
      if (err) {
        return this._log('%s does not support protocol: %s', peer.id.toB58String(), c.PROTOCOL_DHT)
      }

      // TODO: conn.close()
      pull(pull.empty(), conn)

      this.dht._add(peer, (err) => {
        if (err) {
          return this._log.error('Failed to add to the routing table', err)
        }

        this._log('added to the routing table: %s', peer.id.toB58String())
      })
    })
  }

  /**
   * Send a request and record RTT for latency measurements.
   *
   * @param {PeerId} to - The peer that should receive a message
   * @param {Message} msg - The message to send.
   * @param {function(Error, Message)} callback
   * @returns {void}
   */
  sendRequest (to, msg, callback) {
    // TODO: record latency
    if (!this.isConnected) {
      return callback(new Error('Network is offline'))
    }

    this._log('sending to: %s', to.toB58String())
    this.dht.libp2p.dial(to, c.PROTOCOL_DHT, (err, conn) => {
      if (err) {
        return callback(err)
      }

      this._writeReadMessage(conn, msg.serialize(), callback)
    })
  }

  /**
   * Sends a message without expecting an answer.
   *
   * @param {PeerId} to
   * @param {Message} msg
   * @param {function(Error)} callback
   * @returns {void}
   */
  sendMessage (to, msg, callback) {
    if (!this.isConnected) {
      return callback(new Error('Network is offline'))
    }

    this._log('sending to: %s', to.toB58String())

    this.dht.libp2p.dial(to, c.PROTOCOL_DHT, (err, conn) => {
      if (err) {
        return callback(err)
      }

      this._writeMessage(conn, msg.serialize(), callback)
    })
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   *
   * @param {Connection} conn - the connection to use
   * @param {Buffer} msg - the message to send
   * @param {function(Error, Message)} callback
   * @returns {void}
   * @private
   */
  _writeReadMessage (conn, msg, callback) {
    timeout(
      writeReadMessage,
      this.readMessageTimeout
    )(conn, msg, callback)
  }

  /**
   * Write a message to the given connection.
   *
   * @param {Connection} conn - the connection to use
   * @param {Buffer} msg - the message to send
   * @param {function(Error)} callback
   * @returns {void}
   * @private
   */
  _writeMessage (conn, msg, callback) {
    pull(
      pull.values([msg]),
      lp.encode(),
      conn,
      lp.decode(),
      pull.collect((err) => callback(err))
    )
  }
}

function writeReadMessage (conn, msg, callback) {
  pull(
    pull.values([msg]),
    lp.encode(),
    conn,
    pull.filter((msg) => msg.length < c.maxMessageSize),
    lp.decode(),
    pull.collect((err, res) => {
      if (err) {
        return callback(err)
      }
      if (res.length === 0) {
        return callback(new Error('No message received'))
      }

      let response
      try {
        response = Message.deserialize(res[0])
      } catch (err) {
        return callback(new Error('failed to deserialize response: ' + err.message))
      }

      callback(null, response)
    })
  )
}

module.exports = Network

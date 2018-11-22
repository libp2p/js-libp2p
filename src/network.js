'use strict'

const pull = require('pull-stream')
const timeout = require('async/timeout')
const lp = require('pull-length-prefixed')
const setImmediate = require('async/setImmediate')

const errcode = require('err-code')

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
   * @param {KadDHT} self
   */
  constructor (self) {
    this.dht = self
    this.readMessageTimeout = c.READ_MESSAGE_TIMEOUT
    this._log = utils.logger(this.dht.peerInfo.id, 'net')
    this._rpc = rpc(this.dht)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._running = false
  }

  /**
   * Start the network.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  start (callback) {
    const cb = (err) => setImmediate(() => callback(err))

    if (this._running) {
      return cb(errcode(new Error('Network is already running'), 'ERR_NETWORK_ALREADY_RUNNING'))
    }

    // TODO add a way to check if switch has started or not
    if (!this.dht.isStarted) {
      return cb(errcode(new Error('Can not start network'), 'ERR_CANNOT_START_NETWORK'))
    }

    this._running = true

    // handle incoming connections
    this.dht.switch.handle(c.PROTOCOL_DHT, this._rpc)

    // handle new connections
    this.dht.switch.on('peer-mux-established', this._onPeerConnected)

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

    if (!this.dht.isStarted && !this.isStarted) {
      return cb(errcode(new Error('Network is already stopped'), 'ERR_NETWORK_ALREADY_STOPPED'))
    }
    this._running = false
    this.dht.switch.removeListener('peer-mux-established', this._onPeerConnected)

    this.dht.switch.unhandle(c.PROTOCOL_DHT)
    cb()
  }

  /**
   * Is the network online?
   *
   * @type {bool}
   */
  get isStarted () {
    return this._running
  }

  /**
   * Are all network components there?
   *
   * @type {bool}
   */
  get isConnected () {
    // TODO add a way to check if switch has started or not
    return this.dht.isStarted && this.isStarted
  }

  /**
   * Handle new connections in the switch.
   *
   * @param {PeerInfo} peer
   * @returns {void}
   * @private
   */
  _onPeerConnected (peer) {
    if (!this.isConnected) {
      return this._log.error('Network is offline')
    }

    this.dht.switch.dial(peer, c.PROTOCOL_DHT, (err, conn) => {
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
      return callback(errcode(new Error('Network is offline'), 'ERR_NETWORK_OFFLINE'))
    }

    this._log('sending to: %s', to.toB58String())
    this.dht.switch.dial(to, c.PROTOCOL_DHT, (err, conn) => {
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
      return setImmediate(() => callback(errcode(new Error('Network is offline'), 'ERR_NETWORK_OFFLINE')))
    }

    this._log('sending to: %s', to.toB58String())

    this.dht.switch.dial(to, c.PROTOCOL_DHT, (err, conn) => {
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
      pull.onEnd(callback)
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
        return callback(errcode(new Error('No message received'), 'ERR_NO_MESSAGE_RECEIVED'))
      }

      let response
      try {
        response = Message.deserialize(res[0])
      } catch (err) {
        return callback(errcode(err, 'ERR_FAILED_DESERIALIZE_RESPONSE'))
      }

      callback(null, response)
    })
  )
}

module.exports = Network

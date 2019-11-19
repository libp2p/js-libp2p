'use strict'

const pull = require('pull-stream')
const pTimeout = require('p-timeout')
const lp = require('pull-length-prefixed')
const promisify = require('promisify-es6')

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
   * @returns {void}
   */
  start () {
    if (this._running) {
      throw errcode(new Error('Network is already running'), 'ERR_NETWORK_ALREADY_RUNNING')
    }

    // TODO add a way to check if switch has started or not
    if (!this.dht.isStarted) {
      throw errcode(new Error('Can not start network'), 'ERR_CANNOT_START_NETWORK')
    }

    this._running = true

    // handle incoming connections
    this.dht.switch.handle(c.PROTOCOL_DHT, this._rpc)

    // handle new connections
    this.dht.switch.on('peer-mux-established', this._onPeerConnected)
  }

  /**
   * Stop all network activity.
   * @returns {void}
   */
  stop () {
    if (!this.dht.isStarted && !this.isStarted) {
      throw errcode(new Error('Network is already stopped'), 'ERR_NETWORK_ALREADY_STOPPED')
    }
    this._running = false
    this.dht.switch.removeListener('peer-mux-established', this._onPeerConnected)

    this.dht.switch.unhandle(c.PROTOCOL_DHT)
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
   * @returns {Promise<void>}
   * @private
   */
  async _onPeerConnected (peer) {
    if (!this.isConnected) {
      return this._log.error('Network is offline')
    }

    const conn = await promisify(cb => this.dht.switch.dial(peer, c.PROTOCOL_DHT, cb))()

    // TODO: conn.close()
    pull(pull.empty(), conn)

    await this.dht._add(peer)
    this._log('added to the routing table: %s', peer.id.toB58String())
  }

  /**
   * Send a request and record RTT for latency measurements.
   * @async
   * @param {PeerId} to - The peer that should receive a message
   * @param {Message} msg - The message to send.
   * @param {function(Error, Message)} callback
   * @returns {Promise<Message>}
   */
  async sendRequest (to, msg) {
    // TODO: record latency
    if (!this.isConnected) {
      throw errcode(new Error('Network is offline'), 'ERR_NETWORK_OFFLINE')
    }

    this._log('sending to: %s', to.toB58String())

    const conn = await promisify(cb => this.dht.switch.dial(to, c.PROTOCOL_DHT, cb))()
    return this._writeReadMessage(conn, msg.serialize())
  }

  /**
   * Sends a message without expecting an answer.
   *
   * @param {PeerId} to
   * @param {Message} msg
   * @returns {Promise<void>}
   */
  async sendMessage (to, msg) {
    if (!this.isConnected) {
      throw errcode(new Error('Network is offline'), 'ERR_NETWORK_OFFLINE')
    }

    this._log('sending to: %s', to.toB58String())

    const conn = await promisify(cb => this.dht.switch.dial(to, c.PROTOCOL_DHT, cb))()
    return this._writeMessage(conn, msg.serialize())
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   *
   * @param {Connection} conn - the connection to use
   * @param {Buffer} msg - the message to send
   * @returns {Message}
   * @private
   */
  _writeReadMessage (conn, msg) {
    return pTimeout(
      writeReadMessage(conn, msg),
      this.readMessageTimeout
    )
  }

  /**
   * Write a message to the given connection.
   *
   * @param {Connection} conn - the connection to use
   * @param {Buffer} msg - the message to send
   * @returns {Promise<void>}
   * @private
   */
  _writeMessage (conn, msg) {
    return new Promise((resolve, reject) => {
      pull(
        pull.values([msg]),
        lp.encode(),
        conn,
        pull.onEnd((err) => {
          if (err) return reject(err)
          resolve()
        })
      )
    })
  }
}

function writeReadMessage (conn, msg) {
  return new Promise((resolve, reject) => {
    pull(
      pull.values([msg]),
      lp.encode(),
      conn,
      pull.filter((msg) => msg.length < c.maxMessageSize),
      lp.decode(),
      pull.collect((err, res) => {
        if (err) {
          return reject(err)
        }
        if (res.length === 0) {
          return reject(errcode(new Error('No message received'), 'ERR_NO_MESSAGE_RECEIVED'))
        }

        let response
        try {
          response = Message.deserialize(res[0])
        } catch (err) {
          return reject(errcode(err, 'ERR_FAILED_DESERIALIZE_RESPONSE'))
        }

        resolve(response)
      })
    )
  })
}

module.exports = Network

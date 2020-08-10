'use strict'

const errcode = require('err-code')

const pipe = require('it-pipe')
const lp = require('it-length-prefixed')
const pTimeout = require('p-timeout')
const { consume } = require('streaming-iterables')

const MulticodecTopology = require('libp2p-interfaces/src/topology/multicodec-topology')

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
    this._log = utils.logger(this.dht.peerId, 'net')
    this._rpc = rpc(this.dht)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._running = false
  }

  /**
   * Start the network.
   * @returns {Promise<void>}
   */
  async start () {
    if (this._running) {
      return
    }

    if (!this.dht.isStarted) {
      throw errcode(new Error('Can not start network'), 'ERR_CANNOT_START_NETWORK')
    }

    this._running = true

    // Only respond to queries when not in client mode
    if (this.dht._clientMode === false) {
      // Incoming streams
      this.dht.registrar.handle(c.PROTOCOL_DHT, this._rpc)
    }

    // register protocol with topology
    const topology = new MulticodecTopology({
      multicodecs: [c.PROTOCOL_DHT],
      handlers: {
        onConnect: this._onPeerConnected,
        onDisconnect: () => {}
      }
    })
    this._registrarId = await this.dht.registrar.register(topology)
  }

  /**
   * Stop all network activity.
   * @returns {Promise<void>}
   */
  async stop () {
    if (!this.dht.isStarted && !this.isStarted) {
      return
    }
    this._running = false

    // unregister protocol and handlers
    await this.dht.registrar.unregister(this._registrarId)
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
   * Registrar notifies a connection successfully with dht protocol.
   * @private
   * @param {PeerId} peerId remote peer id
   * @returns {Promise<void>}
   */
  async _onPeerConnected (peerId) {
    await this.dht._add(peerId)
    this._log('added to the routing table: %s', peerId.toB58String())
  }

  /**
   * Send a request and record RTT for latency measurements.
   * @async
   * @param {PeerId} to - The peer that should receive a message
   * @param {Message} msg - The message to send.
   * @returns {Promise<Message>}
   */
  async sendRequest (to, msg) {
    // TODO: record latency
    if (!this.isConnected) {
      throw errcode(new Error('Network is offline'), 'ERR_NETWORK_OFFLINE')
    }

    const id = to.toB58String()
    this._log('sending to: %s', id)

    let conn = this.dht.registrar.connectionManager.get(to)
    if (!conn) {
      conn = await this.dht.dialer.connectToPeer(to)
    }

    const { stream } = await conn.newStream(c.PROTOCOL_DHT)

    return this._writeReadMessage(stream, msg.serialize())
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

    const id = to.toB58String()
    this._log('sending to: %s', id)

    let conn = this.dht.registrar.connectionManager.get(to)
    if (!conn) {
      conn = await this.dht.dialer.connectToPeer(to)
    }
    const { stream } = await conn.newStream(c.PROTOCOL_DHT)

    return this._writeMessage(stream, msg.serialize())
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   *
   * @param {DuplexIterable} stream - the stream to use
   * @param {Uint8Array} msg - the message to send
   * @returns {Promise<Message>}
   * @private
   */
  async _writeReadMessage (stream, msg) { // eslint-disable-line require-await
    return pTimeout(
      writeReadMessage(stream, msg),
      this.readMessageTimeout
    )
  }

  /**
   * Write a message to the given stream.
   *
   * @param {DuplexIterable} stream - the stream to use
   * @param {Uint8Array} msg - the message to send
   * @returns {Promise<void>}
   * @private
   */
  _writeMessage (stream, msg) {
    return pipe(
      [msg],
      lp.encode(),
      stream,
      consume
    )
  }
}

async function writeReadMessage (stream, msg) {
  const res = await pipe(
    [msg],
    lp.encode(),
    stream,
    lp.decode(),
    async source => {
      for await (const chunk of source) {
        return chunk.slice()
      }
    }
  )

  if (res.length === 0) {
    throw errcode(new Error('No message received'), 'ERR_NO_MESSAGE_RECEIVED')
  }

  return Message.deserialize(res)
}

module.exports = Network

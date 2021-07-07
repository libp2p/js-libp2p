'use strict'

const errcode = require('err-code')

const { pipe } = require('it-pipe')
const lp = require('it-length-prefixed')
const pTimeout = require('p-timeout')
const { consume } = require('streaming-iterables')
const first = require('it-first')

const MulticodecTopology = require('libp2p-interfaces/src/topology/multicodec-topology')

const rpc = require('./rpc')
const c = require('./constants')
const Message = require('./message')
const utils = require('./utils')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */

/**
 * Handle network operations for the dht
 */
class Network {
  /**
   * Create a new network
   *
   * @param {import('./index')} dht
   */
  constructor (dht) {
    this.dht = dht
    this.readMessageTimeout = c.READ_MESSAGE_TIMEOUT
    this._log = utils.logger(this.dht.peerId, 'net')
    this._rpc = rpc(this.dht)
    this._onPeerConnected = this._onPeerConnected.bind(this)
    this._running = false
  }

  /**
   * Start the network
   */
  start () {
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
      this.dht.registrar.handle(this.dht.protocol, this._rpc)
    }

    // register protocol with topology
    const topology = new MulticodecTopology({
      multicodecs: [this.dht.protocol],
      handlers: {
        onConnect: this._onPeerConnected,
        onDisconnect: () => {}
      }
    })
    this._registrarId = this.dht.registrar.register(topology)
  }

  /**
   * Stop all network activity
   */
  stop () {
    if (!this.dht.isStarted && !this.isStarted) {
      return
    }
    this._running = false

    // unregister protocol and handlers
    if (this._registrarId) {
      this.dht.registrar.unregister(this._registrarId)
    }
  }

  /**
   * Is the network online?
   *
   * @type {boolean}
   */
  get isStarted () {
    return this._running
  }

  /**
   * Are all network components there?
   *
   * @type {boolean}
   */
  get isConnected () {
    // TODO add a way to check if switch has started or not
    return this.dht.isStarted && this.isStarted
  }

  /**
   * Registrar notifies a connection successfully with dht protocol.
   *
   * @param {PeerId} peerId - remote peer id
   */
  async _onPeerConnected (peerId) {
    await this.dht._add(peerId)
    this._log('added to the routing table: %s', peerId.toB58String())
  }

  /**
   * Send a request and record RTT for latency measurements.
   *
   * @async
   * @param {PeerId} to - The peer that should receive a message
   * @param {Message} msg - The message to send.
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

    const { stream } = await conn.newStream(this.dht.protocol)

    return this._writeReadMessage(stream, msg.serialize())
  }

  /**
   * Sends a message without expecting an answer.
   *
   * @param {PeerId} to
   * @param {Message} msg
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
    const { stream } = await conn.newStream(this.dht.protocol)

    return this._writeMessage(stream, msg.serialize())
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   *
   * @param {MuxedStream} stream - the stream to use
   * @param {Uint8Array} msg - the message to send
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
   * @param {MuxedStream} stream - the stream to use
   * @param {Uint8Array} msg - the message to send
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

/**
 * @param {MuxedStream} stream
 * @param {Uint8Array} msg
 */
async function writeReadMessage (stream, msg) {
  const res = await pipe(
    [msg],
    lp.encode(),
    stream,
    lp.decode(),
    /**
     * @param {AsyncIterable<Uint8Array>} source
     */
    async source => {
      const buf = await first(source)

      if (buf) {
        return buf.slice()
      }
    }
  )

  if (res.length === 0) {
    throw errcode(new Error('No message received'), 'ERR_NO_MESSAGE_RECEIVED')
  }

  return Message.deserialize(res)
}

module.exports = Network

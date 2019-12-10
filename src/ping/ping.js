'use strict'

const debug = require('debug')
const log = debug('libp2p-ping')
log.error = debug('libp2p-ping:error')
const errCode = require('err-code')

const { EventEmitter } = require('events')
const handshake = require('it-handshake')
const pipe = require('it-pipe')

const { PROTOCOL, PING_LENGTH } = require('./constants')
const { rnd } = require('./util')

/**
 * Responsible for keeping a ping flow of messages with a given peer.
 * @fires Ping#ping emitted when a ping message was answered with the operation time (in ms)
 * @fires Ping#error
 */
class Ping extends EventEmitter {
  /**
   * @param {Libp2p} node
   * @param {PeerInfo} peer
   * @constructor
   */
  constructor (node, peer) {
    super()

    this._stopped = false
    this.handshake = undefined
    this.peer = peer
    this.node = node
  }

  /**
   * Start the ping messages exchange.
   * @returns {Promise<void>}
   */
  async start () {
    log('dialing %s to %s', PROTOCOL, this.peer.id.toB58String())

    const { stream } = await this.node.dialProtocol(this.peer, PROTOCOL)
    this.handshake = handshake(stream)
    const shakeStream = this.handshake.stream

    // recursive message exchange
    const next = async () => {
      const start = new Date()
      const buf = rnd(PING_LENGTH)

      this.handshake.write(buf)

      const bufBack = await this.handshake.read()
      const end = new Date()

      if (!buf.equals(Buffer.isBuffer(bufBack) ? bufBack : bufBack.slice())) {
        const err = errCode(new Error('Received wrong ping ack'), 'ERR_WRONG_PING_ACK')

        return this.emit('error', err)
      }
      this.emit('ping', end - start)

      if (this._stopped) {
        return
      }
      next()
    }

    pipe(
      shakeStream,
      stream,
      shakeStream
    )

    next()
  }

  /**
   * Stop the ping messages exchange.
   * @returns {void}
   */
  stop () {
    if (this._stopped || !this.shake) {
      return
    }

    this._stopped = true
    this.shake.rest().sink([])
  }
}

module.exports = Ping

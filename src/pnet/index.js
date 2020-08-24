'use strict'

const pipe = require('it-pipe')
const errcode = require('err-code')
const duplexPair = require('it-pair/duplex')
const crypto = require('libp2p-crypto')
const Errors = require('./errors')
const {
  ERR_INVALID_PARAMETERS
} = require('../errors')
const {
  createBoxStream,
  createUnboxStream,
  decodeV1PSK
} = require('./crypto')
const handshake = require('it-handshake')
const { NONCE_LENGTH } = require('./key-generator')
const debug = require('debug')
const log = debug('libp2p:pnet')
log.error = debug('libp2p:pnet:err')

/**
 * Takes a Private Shared Key (psk) and provides a `protect` method
 * for wrapping existing connections in a private encryption stream
 */
class Protector {
  /**
   * @param {Uint8Array} keyBuffer The private shared key buffer
   * @constructor
   */
  constructor (keyBuffer) {
    const decodedPSK = decodeV1PSK(keyBuffer)
    this.psk = decodedPSK.psk
    this.tag = decodedPSK.tag
  }

  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   *
   * @param {Connection} connection The connection to protect
   * @returns {*} A protected duplex iterable
   */
  async protect (connection) {
    if (!connection) {
      throw errcode(new Error(Errors.NO_HANDSHAKE_CONNECTION), ERR_INVALID_PARAMETERS)
    }

    // Exchange nonces
    log('protecting the connection')
    const localNonce = crypto.randomBytes(NONCE_LENGTH)

    const shake = handshake(connection)
    shake.write(localNonce)

    const result = await shake.reader.next(NONCE_LENGTH)
    const remoteNonce = result.value.slice()
    shake.rest()

    // Create the boxing/unboxing pipe
    log('exchanged nonces')
    const [internal, external] = duplexPair()
    pipe(
      external,
      // Encrypt all outbound traffic
      createBoxStream(localNonce, this.psk),
      shake.stream,
      // Decrypt all inbound traffic
      createUnboxStream(remoteNonce, this.psk),
      external
    ).catch(log.error)

    return internal
  }
}

module.exports = Protector
module.exports.errors = Errors
module.exports.generate = require('./key-generator')

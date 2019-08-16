'use strict'

const pull = require('pull-stream')
const Connection = require('interface-connection').Connection
const assert = require('assert')

const Errors = require('./errors')
const State = require('./state')
const decodeV1PSK = require('./crypto').decodeV1PSK
const debug = require('debug')
const log = debug('libp2p:pnet')
log.err = debug('libp2p:pnet:err')

/**
 * Takes a Private Shared Key (psk) and provides a `protect` method
 * for wrapping existing connections in a private encryption stream
 */
class Protector {
  /**
   * @param {Buffer} keyBuffer The private shared key buffer
   * @constructor
   */
  constructor (keyBuffer) {
    const decodedPSK = decodeV1PSK(keyBuffer)
    this.psk = decodedPSK.psk
    this.tag = decodedPSK.tag
  }

  /**
   * Takes a given Connection and creates a privaste encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   *
   * @param {Connection} connection The connection to protect
   * @param {function(Error)} callback
   * @returns {Connection} The protected connection
   */
  protect (connection, callback) {
    assert(connection, Errors.NO_HANDSHAKE_CONNECTION)

    const protectedConnection = new Connection(undefined, connection)
    const state = new State(this.psk)

    log('protecting the connection')

    // Run the connection through an encryptor
    pull(
      connection,
      state.encrypt((err, encryptedOuterStream) => {
        if (err) {
          log.err('There was an error attempting to protect the connection', err)
          return callback(err)
        }

        connection.getPeerInfo(() => {
          protectedConnection.setInnerConn(new Connection(encryptedOuterStream, connection))
          log('the connection has been successfully wrapped by the protector')
          callback()
        })
      }),
      connection
    )

    return protectedConnection
  }
}

module.exports = Protector
module.exports.errors = Errors
module.exports.generate = require('./key-generator')

'use strict'

const crypto = require('crypto')
const debug = require('debug')
const pair = require('pull-pair')
const Reader = require('pull-reader')
const cat = require('pull-cat')
const pull = require('pull-stream')
const deferred = require('pull-defer')

const cryptoStreams = require('./crypto')
const NONCE_LENGTH = require('./key-generator').NONCE_LENGTH

const log = debug('libp2p:pnet')
log.err = debug('libp2p:pnet:err')
log.trace = debug('libp2p:pnet:trace')

/**
 * Keeps track of the state of a given connection, such as the local psk
 * and local and remote nonces for encryption/decryption
 */
class State {
  /**
   * @param {Buffer} psk The key buffer used for encryption
   * @constructor
   */
  constructor (psk) {
    this.local = {
      nonce: Buffer.from(
        crypto.randomBytes(NONCE_LENGTH)
      ),
      psk: psk
    }
    this.remote = { nonce: null }

    this.rawReader = Reader(60e3)
    this.encryptedReader = Reader(60e3)

    this.rawPairStream = pair()
    this.encryptedPairStream = pair()

    // The raw, pair stream
    this.innerRawStream = null
    this.outerRawStream = {
      sink: this.rawReader,
      source: cat([
        pull.values([
          this.local.nonce
        ]),
        this.rawPairStream.source
      ])
    }

    // The encrypted, pair stream
    this.innerEncryptedStream = {
      sink: this.encryptedReader,
      source: this.encryptedPairStream.source
    }
    this.outerEncryptedStream = null
  }

  /**
   * Creates encryption streams for the given state
   *
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  encrypt (callback) {
    // The outer stream needs to be returned before we setup the
    // rest of the streams, so we're delaying the execution
    setTimeout(() => {
      // Read the nonce first, once we have it resolve the
      // deferred source, so we keep reading
      const deferredSource = deferred.source()
      this.rawReader.read(NONCE_LENGTH, (err, data) => {
        if (err) {
          log.err('There was an error attempting to read the nonce', err)
        }
        log.trace('remote nonce received')
        this.remote.nonce = data
        deferredSource.resolve(this.rawReader.read())
      })

      this.innerRawStream = {
        sink: this.rawPairStream.sink,
        source: deferredSource
      }

      // Create the pull exchange between the two inner streams
      pull(
        this.innerRawStream,
        cryptoStreams.createUnboxStream(this.remote, this.local.psk),
        this.innerEncryptedStream,
        cryptoStreams.createBoxStream(this.local.nonce, this.local.psk),
        this.innerRawStream
      )

      this.outerEncryptedStream = {
        sink: this.encryptedPairStream.sink,
        source: this.encryptedReader.read()
      }

      callback(null, this.outerEncryptedStream)
    }, 0)

    return this.outerRawStream
  }
}

module.exports = State

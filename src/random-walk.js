'use strict'

const times = require('async/times')
const crypto = require('libp2p-crypto')
const waterfall = require('async/waterfall')
const multihashing = require('multihashing-async')
const PeerId = require('peer-id')
const assert = require('assert')
const c = require('./constants')
const { logger } = require('./utils')
const AbortController = require('abort-controller')

const errcode = require('err-code')

class RandomWalk {
  /**
   * @constructor
   * @param {DHT} dht
   * @param {object} options
   * @param {randomWalkOptions.enabled} options.enabled
   * @param {randomWalkOptions.queriesPerPeriod} options.queriesPerPeriod
   * @param {randomWalkOptions.interval} options.interval
   * @param {randomWalkOptions.timeout} options.timeout
   * @param {randomWalkOptions.delay} options.delay
   * @param {DHT} options.dht
   */
  constructor (dht, options) {
    assert(dht, 'Random Walk needs an instance of the Kademlia DHT')
    this._options = { ...c.defaultRandomWalk, ...options }
    this._kadDHT = dht
    this.log = logger(dht.peerInfo.id, 'random-walk')
  }

  /**
   * Start the Random Walk process. This means running a number of queries
   * every interval requesting random data. This is done to keep the dht
   * healthy over time.
   *
   * @returns {void}
   */
  start () {
    // Don't run twice
    if (this._timeoutId || !this._options.enabled) { return }

    // Start doing random walks after `this._options.delay`
    this._timeoutId = setTimeout(() => {
      // Start runner immediately
      this._runPeriodically((done) => {
        // Each subsequent walk should run on a `this._options.interval` interval
        this._walk(this._options.queriesPerPeriod, this._options.timeout, () => done(this._options.interval))
      }, 0)
    }, this._options.delay)
  }

  /**
   * Stop the random-walk process. Any active
   * queries will be aborted.
   *
   * @returns {void}
   */
  stop () {
    clearTimeout(this._timeoutId)
    this._timeoutId = null
    this._controller && this._controller.abort()
  }

  /**
   * Run function `walk` on every `interval` ms
   * @param {function(callback)} walk The function to execute on `interval`
   * @param {number} interval The interval to run on in ms
   *
   * @private
   */
  _runPeriodically (walk, interval) {
    this._timeoutId = setTimeout(() => {
      walk((nextInterval) => {
        // Schedule next
        this._runPeriodically(walk, nextInterval)
      })
    }, interval)
  }

  /**
   * Do the random walk work.
   *
   * @param {number} queries
   * @param {number} walkTimeout
   * @param {function(Error)} callback
   * @returns {void}
   *
   * @private
   */
  _walk (queries, walkTimeout, callback) {
    this.log('start')
    this._controller = new AbortController()

    times(queries, (i, next) => {
      this.log('running query %d', i)

      // Perform the walk
      waterfall([
        (cb) => this._randomPeerId(cb),
        (id, cb) => {
          // Check if we've happened to already abort
          if (!this._controller) return cb()

          this._query(id, {
            timeout: walkTimeout,
            signal: this._controller.signal
          }, cb)
        }
      ], (err) => {
        if (err && err.code !== 'ETIMEDOUT') {
          this.log.error('query %d finished with error', i, err)
          return next(err)
        }

        this.log('finished query %d', i)
        next(null)
      })
    }, (err) => {
      this._controller = null
      this.log('finished queries')
      callback(err)
    })
  }

  /**
   * The query run during a random walk request.
   *
   * TODO: While query currently supports an abort controller, it is not
   * yet supported by `DHT.findPeer`. Once https://github.com/libp2p/js-libp2p-kad-dht/pull/82
   * is complete, and AbortController support has been added to the
   * DHT query functions, the abort here will just work, provided the
   * functions support `options.signal`. Once done, this todo should be
   * removed.
   *
   * @param {PeerId} id
   * @param {object} options
   * @param {number} options.timeout
   * @param {AbortControllerSignal} options.signal
   * @param {function(Error)} callback
   * @returns {void}
   *
   * @private
   */
  _query (id, options, callback) {
    this.log('query:%s', id.toB58String())

    this._kadDHT.findPeer(id, options, (err, peer) => {
      if (err && err.code === 'ERR_NOT_FOUND') {
        // expected case, we asked for random stuff after all
        return callback()
      }
      if (err) {
        return callback(err)
      }
      this.log('query:found', peer)

      // wait what, there was something found? Lucky day!
      callback(errcode(new Error(`random-walk: ACTUALLY FOUND PEER: ${peer}, ${id.toB58String()}`), 'ERR_FOUND_RANDOM_PEER'))
    })
  }

  /**
   * Generate a random peer id for random-walk purposes.
   *
   * @param {function(Error, PeerId)} callback
   * @returns {void}
   *
   * @private
   */
  _randomPeerId (callback) {
    multihashing(crypto.randomBytes(16), 'sha2-256', (err, digest) => {
      if (err) {
        return callback(err)
      }
      callback(null, new PeerId(digest))
    })
  }
}

module.exports = RandomWalk

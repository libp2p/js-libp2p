'use strict'

const promisify = require('promisify-es6')
const crypto = require('libp2p-crypto')
const multihashing = promisify(require('multihashing-async'))
const PeerId = require('peer-id')
const assert = require('assert')
const AbortController = require('abort-controller')
const errcode = require('err-code')
const times = require('p-times')
const c = require('./constants')
const { logger } = require('./utils')

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
    this._timeoutId = undefined
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
      this._runPeriodically()
    }, this._options.delay)
  }

  /**
   * Stop the random-walk process. Any active
   * queries will be aborted.
   *
   * @returns {void}
   */
  stop () {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId)
      this._timeoutId = undefined
    }
    this._controller && this._controller.abort()
  }

  /**
   * Run function `randomWalk._walk` on every `options.interval` ms
   *
   * @private
   */
  async _runPeriodically () {
    // run until the walk has been stopped
    while (this._timeoutId) {
      try {
        await this._walk(this._options.queriesPerPeriod, this._options.timeout)
      } catch (err) {
        this._kadDHT._log.error('random-walk:error', err)
      }
      // Each subsequent walk should run on a `this._options.interval` interval
      await new Promise(resolve => {
        this._timeoutId = setTimeout(resolve, this._options.interval)
      })
    }
  }

  /**
   * Do the random walk work.
   *
   * @param {number} queries
   * @param {number} walkTimeout
   * @returns {Promise}
   *
   * @private
   */
  async _walk (queries, walkTimeout) {
    this.log('start')
    this._controller = new AbortController()

    try {
      await times(queries, async (index) => {
        this.log('running query %d', index)
        try {
          const id = await this._randomPeerId()

          // Check if we've happened to already abort
          if (!this._controller) return

          await this._query(id, {
            timeout: walkTimeout,
            signal: this._controller.signal
          })
        } catch (err) {
          if (err && err.code !== 'ETIMEDOUT') {
            this.log.error('query %d finished with error', index, err)
            throw err
          }
        }

        this.log('finished query %d', index)
      })
    } finally {
      this._controller = null
      this.log('finished queries')
    }
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
   * @returns {Promise}
   *
   * @private
   */
  async _query (id, options) {
    this.log('query:%s', id.toB58String())

    let peer
    try {
      peer = await promisify(cb => this._kadDHT.findPeer(id, options, cb))()
    } catch (err) {
      if (err && err.code === 'ERR_NOT_FOUND') {
        // expected case, we asked for random stuff after all
        return
      }

      throw err
    }

    this.log('query:found', peer)

    // wait what, there was something found? Lucky day!
    throw errcode(`random-walk: ACTUALLY FOUND PEER: ${peer}, ${id.toB58String()}`, 'ERR_FOUND_RANDOM_PEER')
  }

  /**
   * Generate a random peer id for random-walk purposes.
   *
   * @returns {Promise<PeerId>}
   *
   * @private
   */
  async _randomPeerId () {
    const digest = await multihashing(crypto.randomBytes(16), 'sha2-256')
    return new PeerId(digest)
  }
}

module.exports = RandomWalk

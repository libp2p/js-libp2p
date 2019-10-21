'use strict'

const cache = require('hashlru')
const varint = require('varint')
const PeerId = require('peer-id')
const Key = require('interface-datastore').Key
const { default: Queue } = require('p-queue')

const c = require('./constants')
const utils = require('./utils')

/**
 * This class manages known providers.
 * A provider is a peer that we know to have the content for a given CID.
 *
 * Every `cleanupInterval` providers are checked if they
 * are still valid, i.e. younger than the `provideValidity`.
 * If they are not, they are deleted.
 *
 * To ensure the list survives restarts of the daemon,
 * providers are stored in the datastore, but to ensure
 * access is fast there is an LRU cache in front of that.
 */
class Providers {
  /**
   * @param {Object} datastore
   * @param {PeerId} [self]
   * @param {number} [cacheSize=256]
   */
  constructor (datastore, self, cacheSize) {
    this.datastore = datastore

    this._log = utils.logger(self, 'providers')

    /**
     * How often invalid records are cleaned. (in seconds)
     *
     * @type {number}
     */
    this.cleanupInterval = c.PROVIDERS_CLEANUP_INTERVAL

    /**
     * How long is a provider valid for. (in seconds)
     *
     * @type {number}
     */
    this.provideValidity = c.PROVIDERS_VALIDITY

    /**
     * LRU cache size
     *
     * @type {number}
     */
    this.lruCacheSize = cacheSize || c.PROVIDERS_LRU_CACHE_SIZE

    this.providers = cache(this.lruCacheSize)

    this.syncQueue = new Queue({ concurrency: 1 })
  }

  /**
   * Release any resources.
   *
   * @returns {undefined}
   */
  stop () {
    if (this._cleaner) {
      clearInterval(this._cleaner)
      this._cleaner = null
    }
  }

  /**
   * Check all providers if they are still valid, and if not delete them.
   *
   * @returns {Promise}
   *
   * @private
   */
  _cleanup () {
    return this.syncQueue.add(async () => {
      this._log('start cleanup')
      const start = Date.now()

      let count = 0
      let deleteCount = 0
      const deleted = new Map()
      const batch = this.datastore.batch()

      // Get all provider entries from the datastore
      const query = this.datastore.query({ prefix: c.PROVIDERS_KEY_PREFIX })
      for await (const entry of query) {
        try {
          // Add a delete to the batch for each expired entry
          const { cid, peerId } = parseProviderKey(entry.key)
          const time = readTime(entry.value)
          const now = Date.now()
          const delta = now - time
          const expired = delta > this.provideValidity
          this._log('comparing: %d - %d = %d > %d %s',
            now, time, delta, this.provideValidity, expired ? '(expired)' : '')
          if (expired) {
            deleteCount++
            batch.delete(entry.key)
            const peers = deleted.get(cid) || new Set()
            peers.add(peerId)
            deleted.set(cid, peers)
          }
          count++
        } catch (err) {
          this._log.error(err.message)
        }
      }
      this._log('deleting %d / %d entries', deleteCount, count)

      // Commit the deletes to the datastore
      if (deleted.size) {
        await batch.commit()
      }

      // Clear expired entries from the cache
      for (const [cid, peers] of deleted) {
        const key = makeProviderKey(cid)
        const provs = this.providers.get(key)
        if (provs) {
          for (const peerId of peers) {
            provs.delete(peerId)
          }
          if (provs.size === 0) {
            this.providers.remove(key)
          } else {
            this.providers.set(key, provs)
          }
        }
      }

      this._log('Cleanup successful (%dms)', Date.now() - start)
    })
  }

  /**
   * Get the currently known provider peer ids for a given CID.
   *
   * @param {CID} cid
   * @returns {Promise<Map<String, Date>>}
   *
   * @private
   */
  async _getProvidersMap (cid) {
    const cacheKey = makeProviderKey(cid)
    let provs = this.providers.get(cacheKey)
    if (!provs) {
      provs = await loadProviders(this.datastore, cid)
      this.providers.set(cacheKey, provs)
    }
    return provs
  }

  get cleanupInterval () {
    return this._cleanupInterval
  }

  set cleanupInterval (val) {
    this._cleanupInterval = val

    if (this._cleaner) {
      clearInterval(this._cleaner)
    }

    this._cleaner = setInterval(
      () => this._cleanup(),
      this.cleanupInterval
    )
  }

  /**
   * Add a new provider for the given CID.
   *
   * @param {CID} cid
   * @param {PeerId} provider
   * @returns {Promise}
   */
  async addProvider (cid, provider) { // eslint-disable-line require-await
    return this.syncQueue.add(async () => {
      this._log('addProvider %s', cid.toBaseEncodedString())
      const provs = await this._getProvidersMap(cid)

      this._log('loaded %s provs', provs.size)
      const now = Date.now()
      provs.set(utils.encodeBase32(provider.id), now)

      const dsKey = makeProviderKey(cid)
      this.providers.set(dsKey, provs)
      return writeProviderEntry(this.datastore, cid, provider, now)
    })
  }

  /**
   * Get a list of providers for the given CID.
   *
   * @param {CID} cid
   * @returns {Promise<Array<PeerId>>}
   */
  async getProviders (cid) { // eslint-disable-line require-await
    return this.syncQueue.add(async () => {
      this._log('getProviders %s', cid.toBaseEncodedString())
      const provs = await this._getProvidersMap(cid)
      return [...provs.keys()].map((base32PeerId) => {
        return new PeerId(utils.decodeBase32(base32PeerId))
      })
    })
  }
}

/**
 * Encode the given key its matching datastore key.
 *
 * @param {CID|string} cid - cid or base32 encoded string
 * @returns {string}
 *
 * @private
 */
function makeProviderKey (cid) {
  cid = typeof cid === 'string' ? cid : utils.encodeBase32(cid.buffer)
  return c.PROVIDERS_KEY_PREFIX + cid
}

/**
 * Write a provider into the given store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @param {PeerId} peer
 * @param {number} time
 * @returns {Promise}
 *
 * @private
 */
async function writeProviderEntry (store, cid, peer, time) { // eslint-disable-line require-await
  const dsKey = [
    makeProviderKey(cid),
    '/',
    utils.encodeBase32(peer.id)
  ].join('')

  const key = new Key(dsKey)
  const buffer = Buffer.from(varint.encode(time))
  return store.put(key, buffer)
}

/**
 * Parse the CID and provider peer id from the key
 *
 * @param {DKey} key
 * @returns {Object} object with peer id and cid
 *
 * @private
 */
function parseProviderKey (key) {
  const parts = key.toString().split('/')
  if (parts.length !== 4) {
    throw new Error('incorrectly formatted provider entry key in datastore: ' + key)
  }

  return {
    cid: parts[2],
    peerId: parts[3]
  }
}

/**
 * Load providers for the given CID from the store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @returns {Promise<Map<PeerId, Date>>}
 *
 * @private
 */
async function loadProviders (store, cid) {
  const providers = new Map()
  const query = store.query({ prefix: makeProviderKey(cid) })
  for await (const entry of query) {
    const { peerId } = parseProviderKey(entry.key)
    providers.set(peerId, readTime(entry.value))
  }
  return providers
}

function readTime (buf) {
  return varint.decode(buf)
}

module.exports = Providers

'use strict'

const cache = require('hashlru')
const varint = require('varint')
const each = require('async/each')
const pull = require('pull-stream')
const CID = require('cids')
const PeerId = require('peer-id')
const Key = require('interface-datastore').Key

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
   * Check all providers if they are still valid, and if not
   * delete them.
   *
   * @returns {undefined}
   *
   * @private
   */
  _cleanup () {
    this._getProviderCids((err, cids) => {
      if (err) {
        return this._log.error('Failed to get cids', err)
      }

      each(cids, (cid, cb) => {
        this._getProvidersMap(cid, (err, provs) => {
          if (err) {
            return cb(err)
          }

          provs.forEach((time, provider) => {
            this._log('comparing: %s - %s > %s', Date.now(), time, this.provideValidity)
            if (Date.now() - time > this.provideValidity) {
              provs.delete(provider)
            }
          })

          if (provs.size === 0) {
            return this._deleteProvidersMap(cid, cb)
          }

          cb()
        })
      }, (err) => {
        if (err) {
          return this._log.error('Failed to cleanup', err)
        }

        this._log('Cleanup successfull')
      })
    })
  }

  /**
   * Get a list of all cids that providers are known for.
   *
   * @param {function(Error, Array<CID>)} callback
   * @returns {undefined}
   *
   * @private
   */
  _getProviderCids (callback) {
    pull(
      this.datastore.query({prefix: c.PROVIDERS_KEY_PREFIX}),
      pull.map((entry) => {
        const parts = entry.key.toString().split('/')
        if (parts.length !== 4) {
          this._log.error('incorrectly formatted provider entry in datastore: %s', entry.key)
          return
        }

        let decoded
        try {
          decoded = utils.decodeBase32(parts[2])
        } catch (err) {
          this._log.error('error decoding base32 provider key: %s', parts[2])
          return
        }

        let cid
        try {
          cid = new CID(decoded)
        } catch (err) {
          this._log.error('error converting key to cid from datastore: %s', err.message)
        }

        return cid
      }),
      pull.filter(Boolean),
      pull.collect(callback)
    )
  }

  /**
   * Get the currently known provider maps for a given CID.
   *
   * @param {CID} cid
   * @param {function(Error, Map<PeerId, Date>)} callback
   * @returns {undefined}
   *
   * @private
   */
  _getProvidersMap (cid, callback) {
    const provs = this.providers.get(makeProviderKey(cid))

    if (!provs) {
      return loadProviders(this.datastore, cid, callback)
    }

    callback(null, provs)
  }

  /**
   * Completely remove a providers map entry for a given CID.
   *
   * @param {CID} cid
   * @param {function(Error)} callback
   * @returns {undefined}
   *
   * @private
   */
  _deleteProvidersMap (cid, callback) {
    const dsKey = makeProviderKey(cid)
    this.providers.set(dsKey, null)
    const batch = this.datastore.batch()

    pull(
      this.datastore.query({
        keysOnly: true,
        prefix: dsKey
      }),
      pull.through((entry) => batch.delete(entry.key)),
      pull.onEnd((err) => {
        if (err) {
          return callback(err)
        }
        batch.commit(callback)
      })
    )
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
   * Add a new provider.
   *
   * @param {CID} cid
   * @param {PeerId} provider
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  addProvider (cid, provider, callback) {
    this._log('addProvider %s', cid.toBaseEncodedString())
    const dsKey = makeProviderKey(cid)
    const provs = this.providers.get(dsKey)

    const next = (err, provs) => {
      if (err) {
        return callback(err)
      }

      this._log('loaded %s provs', provs.size)
      const now = Date.now()
      provs.set(provider, now)

      this.providers.set(dsKey, provs)
      writeProviderEntry(this.datastore, cid, provider, now, callback)
    }

    if (!provs) {
      loadProviders(this.datastore, cid, next)
    } else {
      next(null, provs)
    }
  }

  /**
   * Get a list of providers for the given CID.
   *
   * @param {CID} cid
   * @param {function(Error, Array<PeerId>)} callback
   * @returns {undefined}
   */
  getProviders (cid, callback) {
    this._log('getProviders %s', cid.toBaseEncodedString())
    this._getProvidersMap(cid, (err, provs) => {
      if (err) {
        return callback(err)
      }

      callback(null, Array.from(provs.keys()))
    })
  }
}

/**
 * Encode the given key its matching datastore key.
 *
 * @param {CID} cid
 * @returns {string}
 *
 * @private
 */
function makeProviderKey (cid) {
  return c.PROVIDERS_KEY_PREFIX + utils.encodeBase32(cid.buffer)
}

/**
 * Write a provider into the given store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @param {PeerId} peer
 * @param {number} time
 * @param {function(Error)} callback
 * @returns {undefined}
 *
 * @private
 */
function writeProviderEntry (store, cid, peer, time, callback) {
  const dsKey = [
    makeProviderKey(cid),
    '/',
    utils.encodeBase32(peer.id)
  ].join('')

  store.put(new Key(dsKey), Buffer.from(varint.encode(time)), callback)
}

/**
 * Load providers from the store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @param {function(Error, Map<PeerId, Date>)} callback
 * @returns {undefined}
 *
 * @private
 */
function loadProviders (store, cid, callback) {
  pull(
    store.query({prefix: makeProviderKey(cid)}),
    pull.map((entry) => {
      const parts = entry.key.toString().split('/')
      const lastPart = parts[parts.length - 1]
      const rawPeerId = utils.decodeBase32(lastPart)
      return [new PeerId(rawPeerId), readTime(entry.value)]
    }),
    pull.collect((err, res) => {
      if (err) {
        return callback(err)
      }

      return callback(null, new Map(res))
    })
  )
}

function readTime (buf) {
  return varint.decode(buf)
}

module.exports = Providers

import cache from 'hashlru'
import varint from 'varint'
import { Key } from 'interface-datastore/key'
import Queue from 'p-queue'
import {
  PROVIDERS_CLEANUP_INTERVAL,
  PROVIDERS_VALIDITY,
  PROVIDERS_LRU_CACHE_SIZE,
  PROVIDER_KEY_PREFIX
} from './constants.js'
import { logger } from '@libp2p/logger'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Datastore } from 'interface-datastore'
import type { Startable } from '@libp2p/interfaces/startable'
import type { CID } from 'multiformats'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { Components, Initializable } from '@libp2p/interfaces/components'

const log = logger('libp2p:kad-dht:providers')

export interface ProvidersInit {
  cacheSize?: number
  /**
   * How often invalid records are cleaned. (in seconds)
   */
  cleanupInterval?: number
  /**
   * How long is a provider valid for. (in seconds)
   */
  provideValidity?: number
}

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
export class Providers implements Startable, Initializable {
  private components: Components = new Components()
  private readonly cache: ReturnType<typeof cache>
  private readonly cleanupInterval: number
  private readonly provideValidity: number
  private readonly syncQueue: Queue
  private started: boolean
  private cleaner?: NodeJS.Timer

  constructor (init: ProvidersInit = {}) {
    const { cacheSize, cleanupInterval, provideValidity } = init

    this.cleanupInterval = cleanupInterval ?? PROVIDERS_CLEANUP_INTERVAL
    this.provideValidity = provideValidity ?? PROVIDERS_VALIDITY
    this.cache = cache(cacheSize ?? PROVIDERS_LRU_CACHE_SIZE)
    this.syncQueue = new Queue({ concurrency: 1 })
    this.started = false
  }

  init (components: Components): void {
    this.components = components
  }

  isStarted () {
    return this.started
  }

  /**
   * Start the provider cleanup service
   */
  async start () {
    if (this.started) {
      return
    }

    this.started = true

    this.cleaner = setInterval(
      () => {
        this._cleanup().catch(err => {
          log.error(err)
        })
      },
      this.cleanupInterval
    )
  }

  /**
   * Release any resources.
   */
  async stop () {
    this.started = false

    if (this.cleaner != null) {
      clearInterval(this.cleaner)
      this.cleaner = undefined
    }
  }

  /**
   * Check all providers if they are still valid, and if not delete them
   */
  async _cleanup () {
    return await this.syncQueue.add(async () => {
      const start = Date.now()

      let count = 0
      let deleteCount = 0
      const deleted = new Map<string, Set<string>>()
      const batch = this.components.getDatastore().batch()

      // Get all provider entries from the datastore
      const query = this.components.getDatastore().query({ prefix: PROVIDER_KEY_PREFIX })

      for await (const entry of query) {
        try {
          // Add a delete to the batch for each expired entry
          const { cid, peerId } = parseProviderKey(entry.key)
          const time = readTime(entry.value).getTime()
          const now = Date.now()
          const delta = now - time
          const expired = delta > this.provideValidity

          log('comparing: %d - %d = %d > %d %s', now, time, delta, this.provideValidity, expired ? '(expired)' : '')

          if (expired) {
            deleteCount++
            batch.delete(entry.key)
            const peers = deleted.get(cid) ?? new Set<string>()
            peers.add(peerId)
            deleted.set(cid, peers)
          }
          count++
        } catch (err: any) {
          log.error(err.message)
        }
      }

      // Commit the deletes to the datastore
      if (deleted.size > 0) {
        log('deleting %d / %d entries', deleteCount, count)
        await batch.commit()
      } else {
        log('nothing to delete')
      }

      // Clear expired entries from the cache
      for (const [cid, peers] of deleted) {
        const key = makeProviderKey(cid)
        const provs = this.cache.get(key)

        if (provs != null) {
          for (const peerId of peers) {
            provs.delete(peerId)
          }

          if (provs.size === 0) {
            this.cache.remove(key)
          } else {
            this.cache.set(key, provs)
          }
        }
      }

      log('Cleanup successful (%dms)', Date.now() - start)
    })
  }

  /**
   * Get the currently known provider peer ids for a given CID
   */
  async _getProvidersMap (cid: CID) {
    const cacheKey = makeProviderKey(cid)
    let provs: Map<string, Date> = this.cache.get(cacheKey)

    if (provs == null) {
      provs = await loadProviders(this.components.getDatastore(), cid)
      this.cache.set(cacheKey, provs)
    }

    return provs
  }

  /**
   * Add a new provider for the given CID
   */
  async addProvider (cid: CID, provider: PeerId) {
    return await this.syncQueue.add(async () => {
      log('%p provides %s', provider, cid)
      const provs = await this._getProvidersMap(cid)

      log('loaded %s provs', provs.size)
      const now = new Date()
      provs.set(provider.toString(), now)

      const dsKey = makeProviderKey(cid)
      this.cache.set(dsKey, provs)

      await writeProviderEntry(this.components.getDatastore(), cid, provider, now)
    })
  }

  /**
   * Get a list of providers for the given CID
   */
  async getProviders (cid: CID): Promise<PeerId[]> {
    return await this.syncQueue.add(async () => {
      log('get providers for %s', cid)
      const provs = await this._getProvidersMap(cid)

      return [...provs.keys()].map(peerIdStr => {
        return peerIdFromString(peerIdStr)
      })
    })
  }
}

/**
 * Encode the given key its matching datastore key
 */
function makeProviderKey (cid: CID | string) {
  const cidStr = typeof cid === 'string' ? cid : uint8ArrayToString(cid.multihash.bytes, 'base32')

  return `${PROVIDER_KEY_PREFIX}/${cidStr}`
}

/**
 * Write a provider into the given store
 */
async function writeProviderEntry (store: Datastore, cid: CID, peer: PeerId, time: Date) { // eslint-disable-line require-await
  const dsKey = [
    makeProviderKey(cid),
    '/',
    peer.toString()
  ].join('')

  const key = new Key(dsKey)
  const buffer = Uint8Array.from(varint.encode(time.getTime()))

  return await store.put(key, buffer)
}

/**
 * Parse the CID and provider peer id from the key
 */
function parseProviderKey (key: Key) {
  const parts = key.toString().split('/')

  if (parts.length !== 5) {
    throw new Error(`incorrectly formatted provider entry key in datastore: ${key.toString()}`)
  }

  return {
    cid: parts[3],
    peerId: parts[4]
  }
}

/**
 * Load providers for the given CID from the store
 */
async function loadProviders (store: Datastore, cid: CID) {
  const providers = new Map<string, Date>()
  const query = store.query({ prefix: makeProviderKey(cid) })

  for await (const entry of query) {
    const { peerId } = parseProviderKey(entry.key)
    providers.set(peerId, readTime(entry.value))
  }

  return providers
}

function readTime (buf: Uint8Array) {
  return new Date(varint.decode(buf))
}

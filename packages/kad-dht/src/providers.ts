import { peerIdFromString } from '@libp2p/peer-id'
import cache from 'hashlru'
import { Key } from 'interface-datastore/key'
import Queue from 'p-queue'
import * as varint from 'uint8-varint'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import {
  PROVIDERS_CLEANUP_INTERVAL,
  PROVIDERS_VALIDITY,
  PROVIDERS_LRU_CACHE_SIZE,
  PROVIDER_KEY_PREFIX
} from './constants.js'
import type { ComponentLogger, Logger, PeerId, Startable } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats'

export interface ProvidersInit {
  /**
   * @default 256
   */
  cacheSize?: number
  /**
   * How often invalid records are cleaned. (in seconds)
   *
   * @default 5400
   */
  cleanupInterval?: number
  /**
   * How long is a provider valid for. (in seconds)
   *
   * @default 86400
   */
  provideValidity?: number
}

export interface ProvidersComponents {
  datastore: Datastore
  logger: ComponentLogger
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
export class Providers implements Startable {
  private readonly log: Logger
  private readonly datastore: Datastore
  private readonly cache: ReturnType<typeof cache>
  private readonly cleanupInterval: number
  private readonly provideValidity: number
  private readonly syncQueue: Queue
  private started: boolean
  private cleaner?: ReturnType<typeof setInterval>

  constructor (components: ProvidersComponents, init: ProvidersInit = {}) {
    const { cacheSize, cleanupInterval, provideValidity } = init

    this.log = components.logger.forComponent('libp2p:kad-dht:providers')
    this.datastore = components.datastore
    this.cleanupInterval = cleanupInterval ?? PROVIDERS_CLEANUP_INTERVAL
    this.provideValidity = provideValidity ?? PROVIDERS_VALIDITY
    this.cache = cache(cacheSize ?? PROVIDERS_LRU_CACHE_SIZE)
    this.syncQueue = new Queue({ concurrency: 1 })
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * Start the provider cleanup service
   */
  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true

    this.cleaner = setInterval(
      () => {
        this._cleanup().catch(err => {
          this.log.error(err)
        })
      },
      this.cleanupInterval
    )
  }

  /**
   * Release any resources.
   */
  async stop (): Promise<void> {
    this.started = false

    if (this.cleaner != null) {
      clearInterval(this.cleaner)
      this.cleaner = undefined
    }
  }

  /**
   * Check all providers if they are still valid, and if not delete them
   */
  async _cleanup (): Promise<void> {
    await this.syncQueue.add(async () => {
      const start = Date.now()

      let count = 0
      let deleteCount = 0
      const deleted = new Map<string, Set<string>>()
      const batch = this.datastore.batch()

      // Get all provider entries from the datastore
      const query = this.datastore.query({ prefix: PROVIDER_KEY_PREFIX })

      for await (const entry of query) {
        try {
          // Add a delete to the batch for each expired entry
          const { cid, peerId } = parseProviderKey(entry.key)
          const time = readTime(entry.value).getTime()
          const now = Date.now()
          const delta = now - time
          const expired = delta > this.provideValidity

          this.log('comparing: %d - %d = %d > %d %s', now, time, delta, this.provideValidity, expired ? '(expired)' : '')

          if (expired) {
            deleteCount++
            batch.delete(entry.key)
            const peers = deleted.get(cid) ?? new Set<string>()
            peers.add(peerId)
            deleted.set(cid, peers)
          }
          count++
        } catch (err: any) {
          this.log.error(err.message)
        }
      }

      // Commit the deletes to the datastore
      if (deleted.size > 0) {
        this.log('deleting %d / %d entries', deleteCount, count)
        await batch.commit()
      } else {
        this.log('nothing to delete')
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

      this.log('Cleanup successful (%dms)', Date.now() - start)
    })
  }

  /**
   * Get the currently known provider peer ids for a given CID
   */
  async _getProvidersMap (cid: CID): Promise<Map<string, Date>> {
    const cacheKey = makeProviderKey(cid)
    let provs: Map<string, Date> = this.cache.get(cacheKey)

    if (provs == null) {
      provs = await loadProviders(this.datastore, cid)
      this.cache.set(cacheKey, provs)
    }

    return provs
  }

  /**
   * Add a new provider for the given CID
   */
  async addProvider (cid: CID, provider: PeerId): Promise<void> {
    await this.syncQueue.add(async () => {
      this.log('%p provides %s', provider, cid)
      const provs = await this._getProvidersMap(cid)

      this.log('loaded %s provs', provs.size)
      const now = new Date()
      provs.set(provider.toString(), now)

      const dsKey = makeProviderKey(cid)
      this.cache.set(dsKey, provs)

      await writeProviderEntry(this.datastore, cid, provider, now)
    })
  }

  /**
   * Get a list of providers for the given CID
   */
  async getProviders (cid: CID): Promise<PeerId[]> {
    return this.syncQueue.add(async () => {
      this.log('get providers for %s', cid)
      const provs = await this._getProvidersMap(cid)

      return [...provs.keys()].map(peerIdStr => {
        return peerIdFromString(peerIdStr)
      })
    }, {
      // no timeout is specified for this queue so it will not
      // throw, but this is required to get the right return
      // type since p-queue@7.3.4
      throwOnTimeout: true
    })
  }
}

/**
 * Encode the given key its matching datastore key
 */
function makeProviderKey (cid: CID | string): string {
  const cidStr = typeof cid === 'string' ? cid : uint8ArrayToString(cid.multihash.bytes, 'base32')

  return `${PROVIDER_KEY_PREFIX}/${cidStr}`
}

/**
 * Write a provider into the given store
 */
async function writeProviderEntry (store: Datastore, cid: CID, peer: PeerId, time: Date): Promise<void> {
  const dsKey = [
    makeProviderKey(cid),
    '/',
    peer.toString()
  ].join('')

  const key = new Key(dsKey)
  const buffer = varint.encode(time.getTime())

  await store.put(key, buffer)
}

/**
 * Parse the CID and provider peer id from the key
 */
function parseProviderKey (key: Key): { cid: string, peerId: string } {
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
async function loadProviders (store: Datastore, cid: CID): Promise<Map<string, Date>> {
  const providers = new Map<string, Date>()
  const query = store.query({ prefix: makeProviderKey(cid) })

  for await (const entry of query) {
    const { peerId } = parseProviderKey(entry.key)
    providers.set(peerId, readTime(entry.value))
  }

  return providers
}

function readTime (buf: Uint8Array): Date {
  return new Date(varint.decode(buf))
}

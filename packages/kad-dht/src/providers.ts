import { PeerMap } from '@libp2p/peer-collections'
import * as varint from 'uint8-varint'
import { parseProviderKey, readProviderTime, toProviderKey } from './utils.js'
import type { AbortOptions, ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats'

export interface ProvidersInit {
  logPrefix: string
  datastorePrefix: string
}

export interface ProvidersComponents {
  datastore: Datastore
  logger: ComponentLogger
  metrics?: Metrics
}

interface WriteProviderEntryOptions extends AbortOptions {
  time?: Date
}

/**
 * Provides a mechanism to add and remove provider records from the datastore
 */
export class Providers implements Startable {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly datastorePrefix: string
  private readonly validity: number
  private readonly cleanupInterval: number
  private readonly metrics: MetricsRegistry | undefined
  private running: boolean
  private cleanupTimeout?: ReturnType<typeof setTimeout>
  private readonly providerCache: Map<string, { providers: Set<string>, expires: number }>
  private readonly MAX_CACHE_SIZE = 1000
  private readonly CACHE_CLEANUP_INTERVAL = 60000 // 1 minute
  private readonly BATCH_SIZE = 100 // Number of records to process in one batch

  constructor (components: KadDHTComponents, init: ProvidersInit = {}) {
    this.components = components
    this.log = components.logger.forComponent(init.logPrefix ?? 'libp2p:kad-dht:providers')
    this.datastorePrefix = `${init.datastorePrefix ?? '/dht'}/providers`
    this.validity = init.validity ?? DEFAULT_PROVIDER_VALIDITY
    this.cleanupInterval = init.cleanupInterval ?? DEFAULT_CLEANUP_INTERVAL
    this.metrics = components.metrics
    this.running = false
    this.providerCache = new Map()

    // Start cache cleanup interval
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.providerCache) {
        if (now > value.expires) {
          this.providerCache.delete(key)
        }
      }
    }, this.CACHE_CLEANUP_INTERVAL)
  }

  async start (): Promise<void> {
    this.running = true
    await this.cleanupProviders()
  }

  async stop (): Promise<void> {
    this.running = false
    if (this.cleanupTimeout != null) {
      clearTimeout(this.cleanupTimeout)
    }
  }

  /**
   * Add a provider for the given CID with caching
   */
  async addProvider (cid: CID, provider: PeerId): Promise<void> {
    const now = Date.now()
    const expires = now + this.validity
    const key = makeProviderKey(this.datastorePrefix, cid, provider)

    try {
      await this.components.datastore.put(key, writeProviderTime(now))
      this.metrics?.increment('libp2p_kad_dht_provider_add_total')

      // Update cache
      const cacheKey = cid.toString()
      let cached = this.providerCache.get(cacheKey)
      if (cached == null) {
        cached = { providers: new Set(), expires }
        this.providerCache.set(cacheKey, cached)
      }
      cached.providers.add(provider.toString())
      cached.expires = expires

      // Limit cache size
      if (this.providerCache.size > this.MAX_CACHE_SIZE) {
        const oldestKey = this.providerCache.keys().next().value
        this.providerCache.delete(oldestKey)
      }
    } catch (err) {
      this.log.error('Failed to add provider %p for %c', provider, cid, err)
      this.metrics?.increment('libp2p_kad_dht_provider_add_error')
    }
  }

  /**
   * Get providers for the given CID with caching
   */
  async * getProviders (cid: CID, options: AbortOptions = {}): AsyncGenerator<PeerId> {
    const cacheKey = cid.toString()
    const cached = this.providerCache.get(cacheKey)
    
    if (cached != null && Date.now() < cached.expires) {
      for (const providerStr of cached.providers) {
        try {
          const provider = peerIdFromString(providerStr)
          yield provider
        } catch (err) {
          this.log.error('Invalid cached provider ID %s', providerStr, err)
        }
      }
      return
    }

    const prefix = makeProviderPrefix(this.datastorePrefix, cid)
    const now = Date.now()
    const providers = new Set<string>()
    
    try {
      for await (const entry of this.components.datastore.query({
        prefix
      }, options)) {
        try {
          const { peerId } = parseProviderKey(entry.key)
          const created = readProviderTime(entry.value).getTime()
          
          if (now - created > this.validity) {
            // Provider record has expired, delete it
            await this.components.datastore.delete(entry.key)
            continue
          }
          
          providers.add(peerId.toString())
          yield peerId
        } catch (err) {
          this.log.error('Failed to parse provider record %s', entry.key, err)
        }
      }
      
      // Update cache with valid providers
      if (providers.size > 0) {
        this.providerCache.set(cacheKey, {
          providers,
          expires: now + this.validity
        })
      }
      
      this.metrics?.gauge('libp2p_kad_dht_provider_count', providers.size)
    } catch (err) {
      this.log.error('Failed to get providers for %c', cid, err)
      this.metrics?.increment('libp2p_kad_dht_provider_get_error')
    }
  }

  /**
   * Clean up expired provider records in batches
   */
  private async cleanupProviders (): Promise<void> {
    if (!this.running) {
      return
    }

    const startTime = Date.now()
    let processedCount = 0
    let deletedCount = 0
    let currentBatch: Array<{ key: string, value: Uint8Array }> = []

    try {
      // Process records in batches
      for await (const entry of this.components.datastore.query({
        prefix: this.datastorePrefix
      })) {
        currentBatch.push(entry)
        
        if (currentBatch.length >= this.BATCH_SIZE) {
          const results = await this.processBatch(currentBatch)
          processedCount += results.processed
          deletedCount += results.deleted
          currentBatch = []
        }
      }
      
      // Process remaining records
      if (currentBatch.length > 0) {
        const results = await this.processBatch(currentBatch)
        processedCount += results.processed
        deletedCount += results.deleted
      }

      const duration = Date.now() - startTime
      this.log('Cleanup completed: processed %d records, deleted %d expired records in %dms',
        processedCount, deletedCount, duration)
      
      this.metrics?.histogram('libp2p_kad_dht_cleanup_duration', duration)
      this.metrics?.gauge('libp2p_kad_dht_cleanup_processed', processedCount)
      this.metrics?.gauge('libp2p_kad_dht_cleanup_deleted', deletedCount)
    } catch (err) {
      this.log.error('Failed to cleanup providers', err)
      this.metrics?.increment('libp2p_kad_dht_cleanup_error')
    } finally {
      if (this.running) {
        this.cleanupTimeout = setTimeout(() => {
          this.cleanupProviders().catch(err => {
            this.log.error('Failed to start cleanup', err)
          })
        }, this.cleanupInterval)
      }
    }
  }

  /**
   * Process a batch of provider records
   */
  private async processBatch (batch: Array<{ key: string, value: Uint8Array }>): Promise<{ processed: number, deleted: number }> {
    let deleted = 0
    const now = Date.now()
    
    await Promise.all(batch.map(async entry => {
      try {
        const created = readProviderTime(entry.value).getTime()
        if (now - created > this.validity) {
          await this.components.datastore.delete(entry.key)
          deleted++
        }
      } catch (err) {
        this.log.error('Failed to process provider record %s', entry.key, err)
      }
    }))
    
    return { processed: batch.length, deleted }
  }
}

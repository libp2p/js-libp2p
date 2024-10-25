import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import { AdaptiveTimeout } from '@libp2p/utils/adaptive-timeout'
import { Queue } from '@libp2p/utils/queue'
import drain from 'it-drain'
import { PROVIDERS_VALIDITY, REPROVIDE_CONCURRENCY, REPROVIDE_INTERVAL, REPROVIDE_MAX_QUEUE_SIZE, REPROVIDE_THRESHOLD } from './constants.js'
import { parseProviderKey, readProviderTime } from './utils.js'
import type { ContentRouting } from './content-routing/index.js'
import type { AbortOptions, ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { AdaptiveTimeoutInit } from '@libp2p/utils/adaptive-timeout'
import type { Datastore } from 'interface-datastore'
import type { Mortice } from 'mortice'
import type { CID } from 'multiformats/cid'

export interface ReproviderComponents {
  peerId: PeerId
  datastore: Datastore
  logger: ComponentLogger
  addressManager: AddressManager
  metrics?: Metrics
}

export interface ReproviderInit {
  logPrefix: string
  contentRouting: ContentRouting
  lock: Mortice
  concurrency?: number
  maxQueueSize?: number
  threshold?: number
  validity?: number
  interval?: number
  timeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>
}

interface QueueJobOptions extends AbortOptions {
  cid: CID
}

interface ReprovideEvents {
  'reprovide:start': CustomEvent
  'reprovide:end': CustomEvent
}

export class Reprovider extends TypedEventEmitter<ReprovideEvents> {
  private readonly log: Logger
  private readonly reprovideQueue: Queue<void, QueueJobOptions>
  private readonly maxQueueSize: number
  private readonly datastore: Datastore
  private timeout?: ReturnType<typeof setTimeout>
  private readonly reprovideTimeout: AdaptiveTimeout
  private running: boolean
  private shutdownController?: AbortController
  private readonly reprovideThreshold: number
  private readonly contentRouting: ContentRouting
  private readonly datastorePrefix: string
  private readonly addressManager: AddressManager
  private readonly validity: number
  private readonly interval: number
  private readonly lock: Mortice
  private readonly peerId: PeerId

  constructor (components: ReproviderComponents, init: ReproviderInit) {
    super()

    this.log = components.logger.forComponent(`${init.logPrefix}:reprovider`)
    this.peerId = components.peerId
    this.reprovideQueue = new Queue({
      concurrency: init.concurrency ?? REPROVIDE_CONCURRENCY,
      metrics: components.metrics,
      metricName: `${init.logPrefix.replaceAll(':', '_')}_reprovide_queue`
    })
    this.reprovideTimeout = new AdaptiveTimeout({
      ...(init.timeout ?? {}),
      metrics: components.metrics,
      metricName: `${init.logPrefix.replaceAll(':', '_')}_reprovide_times_milliseconds`
    })
    this.datastore = components.datastore
    this.addressManager = components.addressManager
    this.datastorePrefix = `/${init.logPrefix.replaceAll(':', '/')}/provider`
    this.reprovideThreshold = init.threshold ?? REPROVIDE_THRESHOLD
    this.maxQueueSize = init.maxQueueSize ?? REPROVIDE_MAX_QUEUE_SIZE
    this.validity = init.validity ?? PROVIDERS_VALIDITY
    this.interval = init.interval ?? REPROVIDE_INTERVAL
    this.contentRouting = init.contentRouting
    this.lock = init.lock
    this.running = false
  }

  start (): void {
    if (this.running) {
      return
    }

    this.running = true

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

    this.timeout = setTimeout(() => {
      this.cleanUp().catch(err => {
        this.log.error('error running re-provide - %e', err)
      })
    }, this.interval)
  }

  stop (): void {
    this.running = false
    this.reprovideQueue.clear()
    clearTimeout(this.timeout)
    this.shutdownController?.abort()
  }

  /**
   * Check all provider records. Delete them if they have expired, reprovide
   * them if the provider is us and the expiry is within the reprovide window.
   */
  private async cleanUp (): Promise<void> {
    const release = await this.lock.writeLock()

    try {
      this.safeDispatchEvent('reprovide:start')

      const start = Date.now()

      let count = 0
      let deleteCount = 0
      const deleted = new Map<string, PeerSet>()
      const batch = this.datastore.batch()

      // Get all provider entries from the datastore
      for await (const entry of this.datastore.query({
        prefix: this.datastorePrefix
      })) {
        try {
          // Add a delete to the batch for each expired entry
          const { cid, peerId } = parseProviderKey(entry.key)
          const created = readProviderTime(entry.value).getTime()
          const expires = created + this.validity
          const now = Date.now()
          const expired = now > expires

          this.log.trace('comparing: %d < %d = %s %s', created, now - this.validity, expired, expired ? '(expired)' : '')

          // delete the record if it has expired
          if (expired) {
            deleteCount++
            batch.delete(entry.key)
            const peers = deleted.get(cid.toString()) ?? new PeerSet()
            peers.add(peerId)
            deleted.set(cid.toString(), peers)
          }

          // if the provider is us and we are within the reprovide threshold,
          // reprovide the record
          if (this.peerId.equals(peerId) && (now - expires) < this.reprovideThreshold) {
            this.reprovide(cid)
              .catch(err => {
                this.log.error('could not reprovide %c - %e', cid, err)
              })
          }

          count++
        } catch (err: any) {
          this.log.error('error processing datastore key %s - %e', entry.key, err.message)
        }
      }

      // Commit the deletes to the datastore
      if (deleted.size > 0) {
        this.log('deleting %d / %d entries', deleteCount, count)
        await batch.commit()
      } else {
        this.log('nothing to delete')
      }

      this.log('cleanup successful (%dms)', Date.now() - start)
    } finally {
      release()
      this.safeDispatchEvent('reprovide:end')
      this.log.trace('finished reprovide')

      if (this.running) {
        this.timeout = setTimeout(() => {
          this.cleanUp().catch(err => {
            this.log.error('error running re-provide - %e', err)
          })
        }, this.interval)
      }
    }
  }

  private async reprovide (cid: CID): Promise<void> {
    if (!this.running) {
      return
    }

    this.log.trace('waiting for queue capacity before adding %c to re-provide queue', cid)
    await this.reprovideQueue.onSizeLessThan(this.maxQueueSize)

    const existingJob = this.reprovideQueue.queue.find(job => job.options.cid.equals(cid))

    if (existingJob != null) {
      this.log.trace('not adding %c to re-provide queue - already in queue', cid)
      return existingJob.join()
    }

    this.log.trace('adding %c to re-provide queue', cid)

    this.reprovideQueue.add(async (options): Promise<void> => {
      options.signal?.throwIfAborted()

      if (!this.running) {
        return
      }

      this.log.trace('re-providing %c', cid)

      // use adaptive timeout
      const signal = this.reprovideTimeout.getTimeoutSignal(options)

      try {
        // reprovide
        await drain(this.contentRouting.provide(options.cid, this.addressManager.getAddresses(), {
          signal: options.signal
        }))
      } finally {
        this.reprovideTimeout.cleanUp(signal)
      }

      this.log.trace('re-provided %c', cid)
    }, {
      signal: this.shutdownController?.signal,
      cid
    })
      .catch(err => {
        this.log.error('could not re-provide key %c - %e', cid, err)
      })
  }
}

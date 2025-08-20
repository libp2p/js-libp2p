import { AdaptiveTimeout } from '@libp2p/utils/adaptive-timeout'
import { Queue } from '@libp2p/utils/queue'
import drain from 'it-drain'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { PROVIDERS_VALIDITY, REPROVIDE_CONCURRENCY, REPROVIDE_INTERVAL, REPROVIDE_MAX_QUEUE_SIZE, REPROVIDE_THRESHOLD, REPROVIDE_TIMEOUT } from './constants.js'
import { parseProviderKey, readProviderTime, timeOperationMethod } from './utils.js'
import type { ContentRouting } from './content-routing/index.js'
import type { OperationMetrics } from './kad-dht.js'
import type { AbortOptions, ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { AdaptiveTimeoutInit } from '@libp2p/utils/adaptive-timeout'
import type { Datastore } from 'interface-datastore'
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
  metricsPrefix: string
  datastorePrefix: string
  contentRouting: ContentRouting
  operationMetrics: OperationMetrics
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
  private readonly peerId: PeerId

  constructor (components: ReproviderComponents, init: ReproviderInit) {
    super()

    this.log = components.logger.forComponent(`${init.logPrefix}:reprovider`)
    this.peerId = components.peerId
    this.reprovideQueue = new Queue({
      concurrency: init.concurrency ?? REPROVIDE_CONCURRENCY,
      metrics: components.metrics,
      metricName: `${init.metricsPrefix}_reprovide_queue`
    })
    this.reprovideTimeout = new AdaptiveTimeout({
      ...(init.timeout ?? {}),
      metrics: components.metrics,
      metricName: `${init.metricsPrefix}_reprovide_timeout_milliseconds`
    })
    this.datastore = components.datastore
    this.addressManager = components.addressManager
    this.datastorePrefix = `${init.datastorePrefix}/provider`
    this.reprovideThreshold = init.threshold ?? REPROVIDE_THRESHOLD
    this.maxQueueSize = init.maxQueueSize ?? REPROVIDE_MAX_QUEUE_SIZE
    this.validity = init.validity ?? PROVIDERS_VALIDITY
    this.interval = init.interval ?? REPROVIDE_INTERVAL
    this.contentRouting = init.contentRouting
    this.running = false

    this.reprovide = timeOperationMethod(this.reprovide.bind(this), init.operationMetrics, 'PROVIDE')
  }

  start (): void {
    if (this.running) {
      return
    }

    this.running = true

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

    this.timeout = setTimeout(() => {
      this.processRecords({
        signal: AbortSignal.timeout(REPROVIDE_TIMEOUT)
      }).catch(err => {
        this.log.error('error running process to reprovide/cleanup - %e', err)
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
  private async processRecords (options?: AbortOptions): Promise<void> {
    try {
      this.safeDispatchEvent('reprovide:start')
      this.log('starting reprovide/cleanup')
      // Get all provider entries from the datastore
      for await (const entry of this.datastore.query({
        prefix: this.datastorePrefix
      }, options)) {
        try {
          // Add a delete to the batch for each expired entry
          const { cid, peerId } = parseProviderKey(entry.key)
          const created = readProviderTime(entry.value).getTime()
          const expires = created + this.validity
          const now = Date.now()
          const expired = now > expires
          const isSelf = this.peerId.equals(peerId)

          this.log.trace('comparing: %d (now) < %d (expires) = %s %s', now, expires, expired, expired ? '(expired)' : '(valid)')

          // delete the record if it has expired and isn't us
          // so that if user node is down for a while, we still persist provide intent
          if (expired && !isSelf) {
            await this.datastore.delete(entry.key, options)
          }

          // if the provider is us and we are within the reprovide threshold,
          // reprovide the record
          if (this.shouldReprovide(isSelf, expires)) {
            this.log('reproviding %c as it is within the reprovide threshold (%d)', cid, this.reprovideThreshold)
            this.queueReprovide(cid)
              .catch(err => {
                this.log.error('could not reprovide %c - %e', cid, err)
              })
          }
        } catch (err: any) {
          this.log.error('error processing datastore key %s - %e', entry.key, err.message)
        }
      }

      this.log('reprovide/cleanup successful')
    } finally {
      this.safeDispatchEvent('reprovide:end')

      if (this.running) {
        this.log('queuing next re-provide/cleanup run in %d ms', this.interval)
        this.timeout = setTimeout(() => {
          this.processRecords({
            signal: AbortSignal.timeout(REPROVIDE_TIMEOUT)
          }).catch(err => {
            this.log.error('error running re-provide - %e', err)
          })
        }, this.interval)
      }
    }
  }

  /**
   * Determines if a record should be reprovided
   */
  private shouldReprovide (isSelf: boolean, expires: number): boolean {
    if (!isSelf) {
      return false
    }
    const now = Date.now()

    if (expires < now) {
      // If the record has already expired, reprovide irrespective of the threshold
      return true
    }

    // if the record is approaching expiration within the reprovide threshold
    return expires - now < this.reprovideThreshold
  }

  private async queueReprovide (cid: CID, options?: AbortOptions): Promise<void> {
    if (!this.running) {
      return
    }

    this.log.trace('waiting for queue capacity before adding %c to re-provide queue', cid)
    await this.reprovideQueue.onSizeLessThan(this.maxQueueSize, options)

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
        await this.reprovide(options.cid, options)
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

  private async reprovide (cid: CID, options?: AbortOptions): Promise<void> {
    // reprovide
    await drain(this.contentRouting.provide(cid, this.addressManager.getAddresses(), options))
  }
}

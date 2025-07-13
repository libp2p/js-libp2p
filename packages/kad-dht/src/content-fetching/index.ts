import { NotFoundError } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import map from 'it-map'
import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import {
  ALPHA
} from '../constants.js'
import { QueryError } from '../errors.js'
import { MessageType } from '../message/dht.js'
import {
  valueEvent,
  queryErrorEvent
} from '../query/events.js'
import { bestRecord } from '../record/selectors.js'
import { verifyRecord } from '../record/validators.js'
import { createPutRecord, bufferToRecordKey } from '../utils.js'
import type { KadDHTComponents, Validators, Selectors, ValueEvent, QueryEvent } from '../index.js'
import type { Message } from '../message/dht.js'
import type { Network, SendMessageOptions } from '../network.js'
import type { PeerRouting } from '../peer-routing/index.js'
import type { QueryManager } from '../query/manager.js'
import type { QueryFunc } from '../query/types.js'
import type { AbortOptions, Logger, RoutingOptions } from '@libp2p/interface'

export interface ContentFetchingInit {
  validators: Validators
  selectors: Selectors
  peerRouting: PeerRouting
  queryManager: QueryManager
  network: Network
  logPrefix: string
  datastorePrefix: string
}

export class ContentFetching {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly validators: Validators
  private readonly selectors: Selectors
  private readonly peerRouting: PeerRouting
  private readonly queryManager: QueryManager
  private readonly network: Network
  private readonly datastorePrefix: string
  private readonly recordCache: Map<string, { record: Libp2pRecord, expires: number }>
  private readonly peerResponseTimes: Map<string, number[]>
  private readonly MAX_CACHE_SIZE = 1000
  private readonly MAX_CACHE_AGE = 300000 // 5 minutes
  private readonly MIN_TIMEOUT = 1000 // 1 second
  private readonly MAX_TIMEOUT = 30000 // 30 seconds
  private readonly TIMEOUT_WINDOW = 10 // Number of requests to consider for timeout calculation

  constructor (components: KadDHTComponents, init: ContentFetchingInit) {
    const { validators, selectors, peerRouting, queryManager, network, logPrefix } = init

    this.components = components
    this.log = components.logger.forComponent(`${logPrefix}:content-fetching`)
    this.datastorePrefix = `${init.datastorePrefix}/record`
    this.validators = validators
    this.selectors = selectors
    this.peerRouting = peerRouting
    this.queryManager = queryManager
    this.network = network

    this.get = components.metrics?.traceFunction('libp2p.kadDHT.get', this.get.bind(this), {
      optionsIndex: 1
    }) ?? this.get
    this.put = components.metrics?.traceFunction('libp2p.kadDHT.put', this.put.bind(this), {
      optionsIndex: 2
    }) ?? this.put

    this.recordCache = new Map()
    this.peerResponseTimes = new Map()

    // Clean cache periodically
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.recordCache) {
        if (now > value.expires) {
          this.recordCache.delete(key)
        }
      }
    }, 60000) // Clean every minute
  }

  /**
   * Get adaptive timeout for a peer based on historical response times
   */
  private getPeerTimeout (peerId: string): number {
    const times = this.peerResponseTimes.get(peerId)
    if (times == null || times.length === 0) {
      return this.MAX_TIMEOUT
    }

    // Calculate average response time from recent requests
    const recentTimes = times.slice(-this.TIMEOUT_WINDOW)
    const avg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
    
    // Add 2 standard deviations for safety
    const stdDev = Math.sqrt(recentTimes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recentTimes.length)
    const timeout = avg + (2 * stdDev)

    return Math.min(Math.max(timeout, this.MIN_TIMEOUT), this.MAX_TIMEOUT)
  }

  /**
   * Update peer response time tracking
   */
  private updatePeerResponseTime (peerId: string, responseTime: number): void {
    let times = this.peerResponseTimes.get(peerId)
    if (times == null) {
      times = []
      this.peerResponseTimes.set(peerId, times)
    }
    times.push(responseTime)
    
    // Keep only recent times
    if (times.length > this.TIMEOUT_WINDOW) {
      times.shift()
    }
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore
   */
  async getLocal (key: Uint8Array, options?: AbortOptions): Promise<Libp2pRecord> {
    this.log('getLocal %b', key)

    const dsKey = bufferToRecordKey(this.datastorePrefix, key)

    this.log('fetching record for key %k', dsKey)

    const raw = await this.components.datastore.get(dsKey, options)
    this.log('found %k in local datastore', dsKey)

    const rec = Libp2pRecord.deserialize(raw)

    await verifyRecord(this.validators, rec, options)

    return rec
  }

  /**
   * Send the best record found to any peers that have an out of date record
   */
  async * sendCorrectionRecord (key: Uint8Array, vals: ValueEvent[], best: Uint8Array, options: SendMessageOptions): AsyncGenerator<QueryEvent> {
    this.log('sendCorrection for %b', key)
    const fixupRec = createPutRecord(key, best)

    for (const { value, from } of vals) {
      // no need to do anything
      if (uint8ArrayEquals(value, best)) {
        this.log('record was ok')
        continue
      }

      // correct ourself
      if (this.components.peerId.equals(from)) {
        try {
          const dsKey = bufferToRecordKey(this.datastorePrefix, key)
          this.log(`Storing corrected record for key ${dsKey.toString()}`)
          await this.components.datastore.put(dsKey, fixupRec.subarray(), options)
        } catch (err: any) {
          this.log.error('Failed error correcting self', err)
        }

        continue
      }

      // send correction
      let sentCorrection = false
      const request: Partial<Message> = {
        type: MessageType.PUT_VALUE,
        key,
        record: fixupRec
      }

      for await (const event of this.network.sendRequest(from, request, options)) {
        if (event.name === 'PEER_RESPONSE' && (event.record != null) && uint8ArrayEquals(event.record.value, Libp2pRecord.deserialize(fixupRec).value)) {
          sentCorrection = true
        }

        yield event
      }

      if (!sentCorrection) {
        throw new QueryError('Could not send correction')
      }

      this.log.error('Failed error correcting entry')
    }
  }

  /**
   * Store the given key/value pair in the DHT with caching
   */
  async * put (key: Uint8Array, value: Uint8Array, options: RoutingOptions): AsyncGenerator<unknown, void, undefined> {
    this.log('put key %b value %b', key, value)

    // create record in the dht format
    const record = createPutRecord(key, value)

    // store the record locally
    const dsKey = bufferToRecordKey(this.datastorePrefix, key)
    this.log(`storing record for key ${dsKey.toString()}`)
    await this.components.datastore.put(dsKey, record.subarray(), options)

    // Add to cache
    const cacheKey = uint8ArrayToString(key, 'base64')
    this.recordCache.set(cacheKey, {
      record: Libp2pRecord.deserialize(record),
      expires: Date.now() + this.MAX_CACHE_AGE
    })

    // Limit cache size
    if (this.recordCache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.recordCache.keys().next().value
      this.recordCache.delete(oldestKey)
    }

    // put record to the closest peers
    yield * pipe(
      this.peerRouting.getClosestPeers(key, {
        ...options,
        signal: options.signal
      }),
      (source) => map(source, (event) => {
        return async () => {
          if (event.name !== 'FINAL_PEER') {
            return [event]
          }

          const events = []

          const msg: Partial<Message> = {
            type: MessageType.PUT_VALUE,
            key,
            record
          }

          this.log('send put to %p', event.peer.id)
          for await (const putEvent of this.network.sendRequest(event.peer.id, msg, {
            ...options,
            path: event.path
          })) {
            events.push(putEvent)

            if (putEvent.name !== 'PEER_RESPONSE') {
              continue
            }

            if (!(putEvent.record != null && uint8ArrayEquals(putEvent.record.value, Libp2pRecord.deserialize(record).value))) {
              events.push(queryErrorEvent({
                from: event.peer.id,
                error: new QueryError('Value not put correctly'),
                path: putEvent.path
              }, options))
            }
          }

          return events
        }
      }),
      (source) => parallel(source, {
        ordered: false,
        concurrency: ALPHA
      }),
      async function * (source) {
        for await (const events of source) {
          yield * events
        }
      }
    )
  }

  /**
   * Get the value to the given key with caching and adaptive timeouts
   */
  async * get (key: Uint8Array, options: RoutingOptions): AsyncGenerator<QueryEvent | ValueEvent> {
    this.log('get %b', key)

    const cacheKey = uint8ArrayToString(key, 'base64')
    const cached = this.recordCache.get(cacheKey)

    // Return cached value if still valid
    if (cached != null && Date.now() < cached.expires) {
      yield valueEvent({
        value: cached.record.value,
        from: this.components.peerId,
        path: {
          index: -1,
          running: 0,
          queued: 0,
          total: 0
        }
      }, options)
      return
    }

    const startTime = Date.now()
    
    for await (const event of this.getMany(key, {
      ...options,
      timeout: this.getPeerTimeout(event?.peer?.toString() ?? '')
    })) {
      if (event.name === 'PEER_RESPONSE' && event.peer != null) {
        this.updatePeerResponseTime(event.peer.toString(), Date.now() - startTime)
      }

      if (event.name === 'VALUE') {
        // Cache successful responses
        this.recordCache.set(cacheKey, {
          record: new Libp2pRecord(key, event.value, new Date()),
          expires: Date.now() + this.MAX_CACHE_AGE
        })
      }

      yield event
    }
  }

  /**
   * Get the `n` values to the given key without sorting
   */
  async * getMany (key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    this.log('getMany values for %b', key)

    try {
      const localRec = await this.getLocal(key, options)

      yield valueEvent({
        value: localRec.value,
        from: this.components.peerId,
        path: {
          index: -1,
          running: 0,
          queued: 0,
          total: 0
        }
      }, options)
    } catch (err: any) {
      this.log('error getting local value for %b', key, err)
    }

    const self = this

    const getValueQuery: QueryFunc = async function * ({ peer, signal, path }) {
      for await (const event of self.peerRouting.getValueOrPeers(peer.id, key, {
        ...options,
        signal,
        path
      })) {
        yield event

        if (event.name === 'PEER_RESPONSE' && (event.record != null)) {
          yield valueEvent({
            from: peer.id,
            value: event.record.value,
            path
          }, options)
        }
      }
    }

    // we have peers, lets send the actual query to them
    yield * this.queryManager.run(key, getValueQuery, options)
  }
}

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
   * Store the given key/value pair in the DHT
   */
  async * put (key: Uint8Array, value: Uint8Array, options: RoutingOptions): AsyncGenerator<unknown, void, undefined> {
    this.log('put key %b value %b', key, value)

    // create record in the dht format
    const record = createPutRecord(key, value)

    // store the record locally
    const dsKey = bufferToRecordKey(this.datastorePrefix, key)
    this.log(`storing record for key ${dsKey.toString()}`)
    await this.components.datastore.put(dsKey, record.subarray(), options)

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
   * Get the value to the given key
   */
  async * get (key: Uint8Array, options: RoutingOptions): AsyncGenerator<QueryEvent | ValueEvent> {
    this.log('get %b', key)

    const vals: ValueEvent[] = []

    for await (const event of this.getMany(key, options)) {
      if (event.name === 'VALUE') {
        vals.push(event)
        continue
      }

      yield event
    }

    if (vals.length === 0) {
      return
    }

    const records = vals.map((v) => v.value)
    let i = 0

    try {
      i = bestRecord(this.selectors, key, records)
    } catch (err: any) {
      // Assume the first record if no selector available
      if (err.name !== 'InvalidParametersError') {
        throw err
      }
    }

    const best = records[i]
    this.log('GetValue %b %b', key, best)

    if (best == null) {
      throw new NotFoundError('Best value was not found')
    }

    yield * this.sendCorrectionRecord(key, vals, best, {
      ...options,
      path: {
        index: -1,
        queued: 0,
        running: 0,
        total: 0
      }
    })

    yield vals[i]
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

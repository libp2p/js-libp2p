import { CodeError } from '@libp2p/interfaces/errors'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { Libp2pRecord } from '@libp2p/record'
import { verifyRecord } from '@libp2p/record/validators'
import { bestRecord } from '@libp2p/record/selectors'
import parallel from 'it-parallel'
import map from 'it-map'
import {
  valueEvent,
  queryErrorEvent
} from '../query/events.js'
import { Message, MESSAGE_TYPE } from '../message/index.js'
import { pipe } from 'it-pipe'
import {
  ALPHA
} from '../constants.js'
import { createPutRecord, convertBuffer, bufferToRecordKey } from '../utils.js'
import { logger } from '@libp2p/logger'
import type { Validators, Selectors, ValueEvent, QueryOptions, QueryEvent } from '@libp2p/interface-dht'
import type { PeerRouting } from '../peer-routing/index.js'
import type { QueryManager } from '../query/manager.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { Network } from '../network.js'
import type { Logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interfaces'
import type { QueryFunc } from '../query/types.js'
import type { KadDHTComponents } from '../index.js'

export interface ContentFetchingInit {
  validators: Validators
  selectors: Selectors
  peerRouting: PeerRouting
  queryManager: QueryManager
  routingTable: RoutingTable
  network: Network
  lan: boolean
}

export class ContentFetching {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly validators: Validators
  private readonly selectors: Selectors
  private readonly peerRouting: PeerRouting
  private readonly queryManager: QueryManager
  private readonly routingTable: RoutingTable
  private readonly network: Network

  constructor (components: KadDHTComponents, init: ContentFetchingInit) {
    const { validators, selectors, peerRouting, queryManager, routingTable, network, lan } = init

    this.components = components
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:content-fetching`)
    this.validators = validators
    this.selectors = selectors
    this.peerRouting = peerRouting
    this.queryManager = queryManager
    this.routingTable = routingTable
    this.network = network
  }

  async putLocal (key: Uint8Array, rec: Uint8Array): Promise<void> {
    const dsKey = bufferToRecordKey(key)
    await this.components.datastore.put(dsKey, rec)
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore
   */
  async getLocal (key: Uint8Array): Promise<Libp2pRecord> {
    this.log('getLocal %b', key)

    const dsKey = bufferToRecordKey(key)

    this.log('fetching record for key %k', dsKey)

    const raw = await this.components.datastore.get(dsKey)
    this.log('found %k in local datastore', dsKey)

    const rec = Libp2pRecord.deserialize(raw)

    await verifyRecord(this.validators, rec)

    return rec
  }

  /**
   * Send the best record found to any peers that have an out of date record
   */
  async * sendCorrectionRecord (key: Uint8Array, vals: ValueEvent[], best: Uint8Array, options: AbortOptions = {}): AsyncGenerator<QueryEvent> {
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
          const dsKey = bufferToRecordKey(key)
          this.log(`Storing corrected record for key ${dsKey.toString()}`)
          await this.components.datastore.put(dsKey, fixupRec.subarray())
        } catch (err: any) {
          this.log.error('Failed error correcting self', err)
        }

        continue
      }

      // send correction
      let sentCorrection = false
      const request = new Message(MESSAGE_TYPE.PUT_VALUE, key, 0)
      request.record = Libp2pRecord.deserialize(fixupRec)

      for await (const event of this.network.sendRequest(from, request, options)) {
        if (event.name === 'PEER_RESPONSE' && (event.record != null) && uint8ArrayEquals(event.record.value, Libp2pRecord.deserialize(fixupRec).value)) {
          sentCorrection = true
        }

        yield event
      }

      if (!sentCorrection) {
        yield queryErrorEvent({ from, error: new CodeError('value not put correctly', 'ERR_PUT_VALUE_INVALID') })
      }

      this.log.error('Failed error correcting entry')
    }
  }

  /**
   * Store the given key/value pair in the DHT
   */
  async * put (key: Uint8Array, value: Uint8Array, options: AbortOptions = {}): AsyncGenerator<unknown, void, undefined> {
    this.log('put key %b value %b', key, value)

    // create record in the dht format
    const record = createPutRecord(key, value)

    // store the record locally
    const dsKey = bufferToRecordKey(key)
    this.log(`storing record for key ${dsKey.toString()}`)
    await this.components.datastore.put(dsKey, record.subarray())

    // put record to the closest peers
    yield * pipe(
      this.peerRouting.getClosestPeers(key, { signal: options.signal }),
      (source) => map(source, (event) => {
        return async () => {
          if (event.name !== 'FINAL_PEER') {
            return [event]
          }

          const events = []

          const msg = new Message(MESSAGE_TYPE.PUT_VALUE, key, 0)
          msg.record = Libp2pRecord.deserialize(record)

          this.log('send put to %p', event.peer.id)
          for await (const putEvent of this.network.sendRequest(event.peer.id, msg, options)) {
            events.push(putEvent)

            if (putEvent.name !== 'PEER_RESPONSE') {
              continue
            }

            if (!(putEvent.record != null && uint8ArrayEquals(putEvent.record.value, Libp2pRecord.deserialize(record).value))) {
              events.push(queryErrorEvent({ from: event.peer.id, error: new CodeError('value not put correctly', 'ERR_PUT_VALUE_INVALID') }))
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
  async * get (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent | ValueEvent> {
    this.log('get %b', key)

    const vals: ValueEvent[] = []

    for await (const event of this.getMany(key, options)) {
      if (event.name === 'VALUE') {
        vals.push(event)
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
      if (err.code !== 'ERR_NO_SELECTOR_FUNCTION_FOR_RECORD_KEY') {
        throw err
      }
    }

    const best = records[i]
    this.log('GetValue %b %b', key, best)

    if (best == null) {
      throw new CodeError('best value was not found', 'ERR_NOT_FOUND')
    }

    yield * this.sendCorrectionRecord(key, vals, best, options)

    yield vals[i]
  }

  /**
   * Get the `n` values to the given key without sorting
   */
  async * getMany (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    this.log('getMany values for %b', key)

    try {
      const localRec = await this.getLocal(key)

      yield valueEvent({
        value: localRec.value,
        from: this.components.peerId
      })
    } catch (err: any) {
      this.log('error getting local value for %b', key, err)
    }

    const id = await convertBuffer(key)
    const rtp = this.routingTable.closestPeers(id)

    this.log('found %d peers in routing table', rtp.length)

    const self = this // eslint-disable-line @typescript-eslint/no-this-alias

    const getValueQuery: QueryFunc = async function * ({ peer, signal }) {
      for await (const event of self.peerRouting.getValueOrPeers(peer, key, { signal })) {
        yield event

        if (event.name === 'PEER_RESPONSE' && (event.record != null)) {
          yield valueEvent({ from: peer, value: event.record.value })
        }
      }
    }

    // we have peers, lets send the actual query to them
    yield * this.queryManager.run(key, rtp, getValueQuery, options)
  }
}

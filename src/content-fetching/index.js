'use strict'

const errcode = require('err-code')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const Libp2pRecord = require('libp2p-record')
const {
  ALPHA
} = require('../constants')
const utils = require('../utils')
const Record = Libp2pRecord.Record
const parallel = require('it-parallel')
const map = require('it-map')
const {
  valueEvent,
  queryErrorEvent
} = require('../query/events')
const { Message } = require('../message')
const { pipe } = require('it-pipe')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').ValueEvent} ValueEvent
 */

class ContentFetching {
  /**
   * @param {object} params
   * @param {import('peer-id')} params.peerId
   * @param {import('interface-datastore').Datastore} params.records
   * @param {import('libp2p-interfaces/src/types').DhtValidators} params.validators
   * @param {import('libp2p-interfaces/src/types').DhtSelectors} params.selectors
   * @param {import('../peer-routing').PeerRouting} params.peerRouting
   * @param {import('../query/manager').QueryManager} params.queryManager
   * @param {import('../routing-table').RoutingTable} params.routingTable
   * @param {import('../network').Network} params.network
   * @param {boolean} params.lan
   */
  constructor ({ peerId, records, validators, selectors, peerRouting, queryManager, routingTable, network, lan }) {
    this._log = utils.logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:content-fetching`)
    this._peerId = peerId
    this._records = records
    this._validators = validators
    this._selectors = selectors
    this._peerRouting = peerRouting
    this._queryManager = queryManager
    this._routingTable = routingTable
    this._network = network
  }

  /**
   * @param {Uint8Array} key
   * @param {Uint8Array} rec
   */
  async putLocal (key, rec) { // eslint-disable-line require-await
    return this._records.put(utils.bufferToKey(key), rec)
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore.
   *
   * @param {Uint8Array} key
   */
  async getLocal (key) {
    this._log(`getLocal ${uint8ArrayToString(key, 'base32')}`)

    const dsKey = utils.bufferToKey(key)

    this._log(`fetching record for key ${dsKey}`)
    const raw = await this._records.get(dsKey)
    this._log(`found ${dsKey} in local datastore`)

    const rec = Record.deserialize(raw)

    await Libp2pRecord.validator.verifyRecord(this._validators, rec)

    return rec
  }

  /**
   * Send the best record found to any peers that have an out of date record.
   *
   * @param {Uint8Array} key
   * @param {ValueEvent[]} vals - values retrieved from the DHT
   * @param {Uint8Array} best - the best record that was found
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async * sendCorrectionRecord (key, vals, best, options = {}) {
    this._log('sendCorrection for %b', key)
    const fixupRec = await utils.createPutRecord(key, best)

    for (const { value, from } of vals) {
      // no need to do anything
      if (uint8ArrayEquals(value, best)) {
        this._log('record was ok')
        continue
      }

      // correct ourself
      if (this._peerId.equals(from)) {
        try {
          const dsKey = utils.bufferToKey(key)
          this._log(`Storing corrected record for key ${dsKey}`)
          await this._records.put(dsKey, fixupRec)
        } catch (/** @type {any} */ err) {
          this._log.error('Failed error correcting self', err)
        }

        continue
      }

      // send correction
      let sentCorrection = false
      const request = new Message(Message.TYPES.PUT_VALUE, key, 0)
      request.record = Record.deserialize(fixupRec)

      for await (const event of this._network.sendRequest(from, request, options)) {
        if (event.name === 'PEER_RESPONSE' && event.record && uint8ArrayEquals(event.record.value, Record.deserialize(fixupRec).value)) {
          sentCorrection = true
        }

        yield event
      }

      if (!sentCorrection) {
        yield queryErrorEvent({ from, error: errcode(new Error('value not put correctly'), 'ERR_PUT_VALUE_INVALID') })
      }

      this._log.error('Failed error correcting entry')
    }
  }

  /**
   * Store the given key/value pair in the DHT
   *
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   * @param {object} [options] - put options
   * @param {AbortSignal} [options.signal]
   */
  async * put (key, value, options = {}) {
    this._log('put key %b value %b', key, value)

    // create record in the dht format
    const record = await utils.createPutRecord(key, value)

    // store the record locally
    const dsKey = utils.bufferToKey(key)
    this._log(`storing record for key ${dsKey}`)
    await this._records.put(dsKey, record)

    // put record to the closest peers
    yield * pipe(
      this._peerRouting.getClosestPeers(key, { signal: options.signal }),
      (source) => map(source, (event) => {
        return async () => {
          if (event.name !== 'FINAL_PEER') {
            return [event]
          }

          const events = []

          const msg = new Message(Message.TYPES.PUT_VALUE, key, 0)
          msg.record = Record.deserialize(record)

          for await (const putEvent of this._network.sendRequest(event.peer.id, msg, options)) {
            events.push(putEvent)

            if (putEvent.name !== 'PEER_RESPONSE') {
              continue
            }

            if (putEvent.record && uint8ArrayEquals(putEvent.record.value, Record.deserialize(record).value)) {
            } else {
              events.push(queryErrorEvent({ from: event.peer.id, error: errcode(new Error('value not put correctly'), 'ERR_PUT_VALUE_INVALID') }))
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
   *
   * @param {Uint8Array} key
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * get (key, options = {}) {
    this._log('get %b', key)

    /** @type {ValueEvent[]} */
    const vals = []

    for await (const event of this.getMany(key, options)) {
      if (event.name === 'VALUE') {
        vals.push(event)
      }

      yield event
    }

    if (!vals.length) {
      return
    }

    const records = vals.map((v) => v.value)
    let i = 0

    try {
      i = Libp2pRecord.selection.bestRecord(this._selectors, key, records)
    } catch (/** @type {any} */ err) {
      // Assume the first record if no selector available
      if (err.code !== 'ERR_NO_SELECTOR_FUNCTION_FOR_RECORD_KEY') {
        throw err
      }
    }

    const best = records[i]
    this._log('GetValue %b %b', key, best)

    if (!best) {
      throw errcode(new Error('best value was not found'), 'ERR_NOT_FOUND')
    }

    yield * this.sendCorrectionRecord(key, vals, best, options)

    yield vals[i]
  }

  /**
   * Get the `n` values to the given key without sorting.
   *
   * @param {Uint8Array} key
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * getMany (key, options = {}) {
    this._log('getMany values for %t', key)

    try {
      const localRec = await this.getLocal(key)

      yield valueEvent({
        value: localRec.value,
        from: this._peerId
      })
    } catch (/** @type {any} */ err) {
      this._log('error getting local value for %b', key, err)
    }

    const id = await utils.convertBuffer(key)
    const rtp = this._routingTable.closestPeers(id)

    this._log('found %d peers in routing table', rtp.length)

    const self = this

    /**
     * @type {import('../query/types').QueryFunc}
     */
    const getValueQuery = async function * ({ peer, signal }) {
      for await (const event of self._peerRouting.getValueOrPeers(peer, key, { signal })) {
        yield event

        if (event.name === 'PEER_RESPONSE' && event.record) {
          yield valueEvent({ from: peer, value: event.record.value })
        }
      }
    }

    // we have peers, lets send the actual query to them
    yield * this._queryManager.run(key, rtp, getValueQuery, options)
  }
}

module.exports.ContentFetching = ContentFetching

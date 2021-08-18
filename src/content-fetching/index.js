'use strict'

const errcode = require('err-code')
const pTimeout = require('p-timeout')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const libp2pRecord = require('libp2p-record')
const c = require('../constants')
const Query = require('../query')
const utils = require('../utils')
const Record = libp2pRecord.Record

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../query').DHTQueryResult} DHTQueryResult
 */

/**
 * @param {import('../')} dht
 */
module.exports = (dht) => {
  /**
   * @param {Uint8Array} key
   * @param {Uint8Array} rec
   */
  const putLocal = async (key, rec) => { // eslint-disable-line require-await
    return dht.datastore.put(utils.bufferToKey(key), rec)
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore.
   *
   * @param {Uint8Array} key
   */
  const getLocal = async (key) => {
    dht._log(`getLocal ${uint8ArrayToString(key, 'base32')}`)

    const raw = await dht.datastore.get(utils.bufferToKey(key))
    dht._log(`found ${uint8ArrayToString(key, 'base32')} in local datastore`)

    const rec = Record.deserialize(raw)

    await dht._verifyRecordLocally(rec)

    return rec
  }

  /**
   * Send the best record found to any peers that have an out of date record.
   *
   * @param {Uint8Array} key
   * @param {import('../query').DHTQueryValue[]} vals - values retrieved from the DHT
   * @param {Uint8Array} best - the best record that was found
   */
  const sendCorrectionRecord = async (key, vals, best) => {
    const fixupRec = await utils.createPutRecord(key, best)

    return Promise.all(vals.map(async (v) => {
      // no need to do anything
      if (uint8ArrayEquals(v.val, best)) {
        return
      }

      // correct ourself
      if (dht._isSelf(v.from)) {
        try {
          await dht._putLocal(key, fixupRec)
        } catch (err) {
          dht._log.error('Failed error correcting self', err)
        }
        return
      }

      // send correction
      try {
        await dht._putValueToPeer(key, fixupRec, v.from)
      } catch (err) {
        dht._log.error('Failed error correcting entry', err)
      }
    }))
  }

  return {
    /**
     * Store the given key/value pair locally, in the datastore.
     *
     * @param {Uint8Array} key
     * @param {Uint8Array} rec - encoded record
     */
    async _putLocal (key, rec) { // eslint-disable-line require-await
      return putLocal(key, rec)
    },

    /**
     * Store the given key/value  pair in the DHT.
     *
     * @param {Uint8Array} key
     * @param {Uint8Array} value
     * @param {object} [options] - put options
     * @param {number} [options.minPeers] - minimum number of peers required to successfully put (default: closestPeers.length)
     */
    async put (key, value, options = {}) {
      dht._log('PutValue %b', key)

      // create record in the dht format
      const record = await utils.createPutRecord(key, value)

      // store the record locally
      await putLocal(key, record)

      // put record to the closest peers
      let counterAll = 0
      let counterSuccess = 0

      await utils.mapParallel(dht.getClosestPeers(key, { shallow: true }), async (peer) => {
        try {
          counterAll += 1
          await dht._putValueToPeer(key, record, peer)
          counterSuccess += 1
        } catch (err) {
          dht._log.error('Failed to put to peer (%b): %s', peer.id, err)
        }
      })

      // verify if we were able to put to enough peers
      const minPeers = options.minPeers || counterAll // Ensure we have a default `minPeers`

      if (minPeers > counterSuccess) {
        const error = errcode(new Error(`Failed to put value to enough peers: ${counterSuccess}/${minPeers}`), 'ERR_NOT_ENOUGH_PUT_PEERS')
        dht._log.error(error)
        throw error
      }
    },

    /**
     * Get the value to the given key.
     * Times out after 1 minute by default.
     *
     * @param {Uint8Array} key
     * @param {object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     */
    async get (key, options = {}) {
      options.timeout = options.timeout || c.minute

      dht._log('_get %b', key)

      const vals = await dht.getMany(key, c.GET_MANY_RECORD_COUNT, options)
      const recs = vals.map((v) => v.val)
      let i = 0

      try {
        i = libp2pRecord.selection.bestRecord(dht.selectors, key, recs)
      } catch (err) {
        // Assume the first record if no selector available
        if (err.code !== 'ERR_NO_SELECTOR_FUNCTION_FOR_RECORD_KEY') {
          throw err
        }
      }

      const best = recs[i]
      dht._log('GetValue %b %s', key, best)

      if (!best) {
        throw errcode(new Error('best value was not found'), 'ERR_NOT_FOUND')
      }

      await sendCorrectionRecord(key, vals, best)

      return best
    },

    /**
     * Get the `n` values to the given key without sorting.
     *
     * @param {Uint8Array} key
     * @param {number} nvals
     * @param {object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     */
    async getMany (key, nvals, options = {}) {
      options.timeout = options.timeout || c.minute

      dht._log('getMany %b (%s)', key, nvals)

      const vals = []
      let localRec

      try {
        localRec = await getLocal(key)
      } catch (err) {
        if (nvals === 0) {
          throw err
        }
      }

      if (localRec) {
        vals.push({
          val: localRec.value,
          from: dht.peerId
        })
      }

      if (vals.length >= nvals) {
        return vals
      }

      const id = await utils.convertBuffer(key)
      const rtp = dht.routingTable.closestPeers(id, dht.kBucketSize)

      dht._log('peers in rt: %d', rtp.length)

      if (rtp.length === 0) {
        const errMsg = 'Failed to lookup key! No peers from routing table!'

        dht._log.error(errMsg)
        if (vals.length === 0) {
          throw errcode(new Error(errMsg), 'ERR_NO_PEERS_IN_ROUTING_TABLE')
        }
        return vals
      }

      const valsLength = vals.length

      /**
       * @param {number} pathIndex
       * @param {number} numPaths
       */
      function createQuery (pathIndex, numPaths) {
        // This function body runs once per disjoint path
        const pathSize = utils.pathSize(nvals - valsLength, numPaths)
        let queryResults = 0

        /**
         * Here we return the query function to use on this particular disjoint path
         *
         * @param {PeerId} peer
         */
        async function disjointPathQuery (peer) {
          let rec, peers, lookupErr
          try {
            const results = await dht._getValueOrPeers(peer, key)
            rec = results.record
            peers = results.peers
          } catch (err) {
            // If we have an invalid record we just want to continue and fetch a new one.
            if (err.code !== 'ERR_INVALID_RECORD') {
              throw err
            }
            lookupErr = err
          }

          /** @type {import('../query').QueryResult} */
          const res = {
            closerPeers: peers
          }

          if (rec && rec.value) {
            vals.push({
              val: rec.value,
              from: peer
            })

            queryResults++
          } else if (lookupErr) {
            vals.push({
              err: lookupErr,
              from: peer
            })

            queryResults++
          }

          // enough is enough
          if (queryResults >= pathSize) {
            res.pathComplete = true
          }

          return res
        }

        return disjointPathQuery
      }

      // we have peers, lets send the actual query to them
      const query = new Query(dht, key, createQuery)

      try {
        await pTimeout(query.run(rtp), options.timeout)
      } catch (err) {
        if (vals.length === 0) {
          throw err
        }
      } finally {
        query.stop()
      }

      return vals
    }
  }
}

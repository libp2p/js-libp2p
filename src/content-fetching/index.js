'use strict'

const errcode = require('err-code')
const pTimeout = require('p-timeout')
const uint8ArrayEquals = require('uint8arrays/equals')
const libp2pRecord = require('libp2p-record')

const c = require('../constants')
const Query = require('../query')

const utils = require('../utils')

const Record = libp2pRecord.Record

module.exports = (dht) => {
  const putLocal = async (key, rec) => { // eslint-disable-line require-await
    return dht.datastore.put(utils.bufferToKey(key), rec)
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore.
   *
   * @param {Uint8Array} key
   * @returns {Promise<Record>}
   *
   * @private
   */
  const getLocal = async (key) => {
    dht._log('getLocal %b', key)

    const raw = await dht.datastore.get(utils.bufferToKey(key))
    dht._log('found %b in local datastore', key)
    const rec = Record.deserialize(raw)

    await dht._verifyRecordLocally(rec)
    return rec
  }

  /**
   * Send the best record found to any peers that have an out of date record.
   *
   * @param {Uint8Array} key
   * @param {Array<Object>} vals - values retrieved from the DHT
   * @param {Object} best - the best record that was found
   * @returns {Promise}
   *
   * @private
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
     * @param {Uint8Array} key
     * @param {Uint8Array} rec - encoded record
     * @returns {Promise<void>}
     * @private
     */
    async _putLocal (key, rec) { // eslint-disable-line require-await
      return putLocal(key, rec)
    },

    /**
     * Store the given key/value  pair in the DHT.
     *
     * @param {Uint8Array} key
     * @param {Uint8Array} value
     * @param {Object} [options] - put options
     * @param {number} [options.minPeers] - minimum number of peers required to successfully put (default: closestPeers.length)
     * @returns {Promise<void>}
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
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     * @returns {Promise<Uint8Array>}
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
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     * @returns {Promise<Array<{from: PeerId, val: Uint8Array}>>}
     */
    async getMany (key, nvals, options = {}) {
      options.timeout = options.timeout || c.minute

      dht._log('getMany %b (%s)', key, nvals)

      let vals = []
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

      const paths = []
      const id = await utils.convertBuffer(key)
      const rtp = dht.routingTable.closestPeers(id, this.kBucketSize)

      dht._log('peers in rt: %d', rtp.length)

      if (rtp.length === 0) {
        const errMsg = 'Failed to lookup key! No peers from routing table!'

        dht._log.error(errMsg)
        if (vals.length === 0) {
          throw errcode(new Error(errMsg), 'ERR_NO_PEERS_IN_ROUTING_TABLE')
        }
        return vals
      }

      // we have peers, lets do the actual query to them
      const query = new Query(dht, key, (pathIndex, numPaths) => {
        // This function body runs once per disjoint path
        const pathSize = utils.pathSize(nvals - vals.length, numPaths)
        const pathVals = []
        paths.push(pathVals)

        // Here we return the query function to use on this particular disjoint path
        return async (peer) => {
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

          const res = { closerPeers: peers }

          if ((rec && rec.value) || lookupErr) {
            pathVals.push({
              val: rec && rec.value,
              from: peer
            })
          }

          // enough is enough
          if (pathVals.length >= pathSize) {
            res.pathComplete = true
          }

          return res
        }
      })

      let error
      try {
        await pTimeout(query.run(rtp), options.timeout)
      } catch (err) {
        error = err
      }
      query.stop()

      // combine vals from each path
      vals = [].concat.apply(vals, paths).slice(0, nvals)

      if (error && vals.length === 0) {
        throw error
      }

      return vals
    }
  }
}

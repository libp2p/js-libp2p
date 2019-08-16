'use strict'

const PeerId = require('peer-id')
const libp2pRecord = require('libp2p-record')
const timeout = require('async/timeout')
const PeerInfo = require('peer-info')
const promisify = require('promisify-es6')
const promiseToCallback = require('promise-to-callback')
const errcode = require('err-code')

const utils = require('./utils')
const Message = require('./message')
const c = require('./constants')
const Query = require('./query')
const LimitedPeerList = require('./limited-peer-list')

const Record = libp2pRecord.Record

module.exports = (dht) => ({
  /**
   * Returns the routing tables closest peers, for the key of
   * the message.
   *
   * @param {Message} msg
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {undefined}
   * @private
   */
  _nearestPeersToQuery (msg, callback) {
    promiseToCallback(this._nearestPeersToQueryAsync(msg))(callback)
  },

  async _nearestPeersToQueryAsync (msg) {
    const key = await promisify(utils.convertBuffer)(msg.key)

    const ids = dht.routingTable.closestPeers(key, dht.kBucketSize)
    return ids.map((p) => {
      if (dht.peerBook.has(p)) {
        return dht.peerBook.get(p)
      }
      return dht.peerBook.put(new PeerInfo(p))
    })
  },
  /**
   * Get the nearest peers to the given query, but iff closer
   * than self.
   *
   * @param {Message} msg
   * @param {PeerInfo} peer
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {undefined}
   * @private
   */

  _betterPeersToQuery (msg, peer, callback) {
    promiseToCallback(this._betterPeersToQueryAsync(msg, peer))(callback)
  },

  async _betterPeersToQueryAsync (msg, peer) {
    dht._log('betterPeersToQuery')
    const closer = await dht._nearestPeersToQueryAsync(msg)

    return closer.filter((closer) => {
      if (dht._isSelf(closer.id)) {
        // Should bail, not sure
        dht._log.error('trying to return self as closer')
        return false
      }

      return !closer.id.isEqual(peer.id)
    })
  },

  /**
   * Try to fetch a given record by from the local datastore.
   * Returns the record iff it is still valid, meaning
   * - it was either authored by this node, or
   * - it was received less than `MAX_RECORD_AGE` ago.
   *
   * @param {Buffer} key
   * @param {function(Error, Record)} callback
   * @returns {undefined}
   *
   *@private
   */

  _checkLocalDatastore (key, callback) {
    promiseToCallback(this._checkLocalDatastoreAsync(key))(callback)
  },

  async _checkLocalDatastoreAsync (key) {
    dht._log('checkLocalDatastore: %b', key)
    const dsKey = utils.bufferToKey(key)

    // Fetch value from ds
    let rawRecord
    try {
      rawRecord = await dht.datastore.get(dsKey)
    } catch (err) {
      if (err.code === 'ERR_NOT_FOUND') {
        return undefined
      }
      throw err
    }

    // Create record from the returned bytes
    const record = Record.deserialize(rawRecord)

    if (!record) {
      throw errcode('Invalid record', 'ERR_INVALID_RECORD')
    }

    // Check validity: compare time received with max record age
    if (record.timeReceived == null ||
        utils.now() - record.timeReceived > c.MAX_RECORD_AGE) {
      // If record is bad delete it and return
      await dht.datastore.delete(dsKey)
      return undefined
    }

    // Record is valid
    return record
  },
  /**
   * Add the peer to the routing table and update it in the peerbook.
   *
   * @param {PeerInfo} peer
   * @param {function(Error)} callback
   * @returns {undefined}
   *
   * @private
   */

  _add (peer, callback) {
    promiseToCallback(this._addAsync(peer))(err => callback(err))
  },

  async _addAsync (peer) {
    peer = dht.peerBook.put(peer)
    await promisify(cb => dht.routingTable.add(peer.id, cb))()
    return undefined
  },
  /**
   * Verify a record without searching the DHT.
   *
   * @param {Record} record
   * @param {function(Error)} callback
   * @returns {undefined}
   *
   * @private
   */

  _verifyRecordLocally (record, callback) {
    promiseToCallback(this._verifyRecordLocallyAsync(record))(err => callback(err))
  },

  async _verifyRecordLocallyAsync (record) {
    dht._log('verifyRecordLocally')
    await promisify(cb => libp2pRecord.validator.verifyRecord(
      dht.validators,
      record,
      cb
    ))()
  },

  /**
   * Find close peers for a given peer
   *
   * @param {Buffer} key
   * @param {PeerId} peer
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {void}
   *
   * @private
   */

  _closerPeersSingle (key, peer, callback) {
    promiseToCallback(this._closerPeersSingleAsync(key, peer))(callback)
  },

  async _closerPeersSingleAsync (key, peer) {
    dht._log('_closerPeersSingle %b from %s', key, peer.toB58String())
    const msg = await dht._findPeerSingleAsync(peer, new PeerId(key))
    return msg.closerPeers
      .filter((pInfo) => !dht._isSelf(pInfo.id))
      .map((pInfo) => dht.peerBook.put(pInfo))
  },

  /**
   * Is the given peer id our PeerId?
   *
   * @param {PeerId} other
   * @returns {bool}
   *
   * @private
   */

  _isSelf (other) {
    return other && dht.peerInfo.id.id.equals(other.id)
  },

  /**
   * Ask peer `peer` if they know where the peer with id `target` is.
   *
   * @param {PeerId} peer
   * @param {PeerId} target
   * @param {function(Error, Message)} callback
   * @returns {void}
   *
   * @private
   */

  _findPeerSingle (peer, target, callback) {
    promiseToCallback(this._findPeerSingleAsync(peer, target))(callback)
  },

  async _findPeerSingleAsync (peer, target) { // eslint-disable-line require-await
    dht._log('_findPeerSingle %s', peer.toB58String())
    const msg = new Message(Message.TYPES.FIND_NODE, target.id, 0)
    return promisify(callback => dht.network.sendRequest(peer, msg, callback))()
  },

  /**
   * Store the given key/value pair at the peer `target`.
   *
   * @param {Buffer} key
   * @param {Buffer} rec - encoded record
   * @param {PeerId} target
   * @param {function(Error)} callback
   * @returns {void}
   *
   * @private
   */

  _putValueToPeer (key, rec, target, callback) {
    promiseToCallback(this._putValueToPeerAsync(key, rec, target))(callback)
  },

  async _putValueToPeerAsync (key, rec, target) {
    const msg = new Message(Message.TYPES.PUT_VALUE, key, 0)
    msg.record = rec

    const resp = await promisify(cb => dht.network.sendRequest(target, msg, cb))()

    if (!resp.record.value.equals(Record.deserialize(rec).value)) {
      throw errcode(new Error('value not put correctly'), 'ERR_PUT_VALUE_INVALID')
    }
  },

  /**
   * Store the given key/value pair locally, in the datastore.
   * @param {Buffer} key
   * @param {Buffer} rec - encoded record
   * @param {function(Error)} callback
   * @returns {void}
   *
   * @private
   */

  _putLocal (key, rec, callback) {
    promiseToCallback(this._putLocalAsync(key, rec))(err => callback(err))
  },

  async _putLocalAsync (key, rec) {
    await dht.datastore.put(utils.bufferToKey(key), rec)
    return undefined
  },

  /**
   * Get the value for given key.
   *
   * @param {Buffer} key
   * @param {Object} options - get options
   * @param {number} options.timeout - optional timeout (default: 60000)
   * @param {function(Error, Record)} callback
   * @returns {void}
   *
   * @private
   */

  _get (key, options, callback) {
    promiseToCallback(this._getAsync(key, options))(callback)
  },

  async _getAsync (key, options) {
    dht._log('_get %b', key)

    const vals = await promisify(cb => dht.getMany(key, c.GET_MANY_RECORD_COUNT, options, cb))()

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

    await this._sendCorrectionRecord(key, vals, best)

    return best
  },

  /**
   * Send the best record found to any peers that have an out of date record.
   *
   * @param {Buffer} key
   * @param {Array<Object>} vals - values retrieved from the DHT
   * @param {Object} best - the best record that was found
   * @returns {Promise}
   *
   * @private
   */
  async _sendCorrectionRecord (key, vals, best) {
    const fixupRec = await promisify(cb => utils.createPutRecord(key, best, cb))()

    return Promise.all(vals.map(async (v) => {
      // no need to do anything
      if (v.val.equals(best)) {
        return
      }

      // correct ourself
      if (dht._isSelf(v.from)) {
        try {
          await dht._putLocalAsync(key, fixupRec)
        } catch (err) {
          dht._log.error('Failed error correcting self', err)
        }
        return
      }

      // send correction
      try {
        await dht._putValueToPeerAsync(key, fixupRec, v.from)
      } catch (err) {
        dht._log.error('Failed error correcting entry', err)
      }
    }))
  },

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore.
   *
   * @param {Buffer} key
   * @param {function(Error, Record)} callback
   * @returns {void}
   *
   * @private
   */
  _getLocal (key, callback) {
    promiseToCallback(this._getLocalAsync(key))(callback)
  },

  async _getLocalAsync (key) {
    dht._log('getLocal %b', key)

    const raw = await dht.datastore.get(utils.bufferToKey(key))
    dht._log('found %b in local datastore', key)
    const rec = Record.deserialize(raw)

    await dht._verifyRecordLocallyAsync(rec)
    return rec
  },

  /**
   * Query a particular peer for the value for the given key.
   * It will either return the value or a list of closer peers.
   *
   * Note: The peerbook is updated with new addresses found for the given peer.
   *
   * @param {PeerId} peer
   * @param {Buffer} key
   * @param {function(Error, Redcord, Array<PeerInfo>)} callback
   * @returns {void}
   *
   * @private
   */

  _getValueOrPeers (peer, key, callback) {
    promiseToCallback(this._getValueOrPeersAsync(peer, key))((err, result) => {
      if (err) return callback(err)
      callback(null, result.record, result.peers)
    })
  },

  async _getValueOrPeersAsync (peer, key) {
    const msg = await promisify(cb => dht._getValueSingle(peer, key, cb))()

    const peers = msg.closerPeers
    const record = msg.record

    if (record) {
      // We have a record
      try {
        await dht._verifyRecordOnlineAsync(record)
      } catch (err) {
        const errMsg = 'invalid record received, discarded'
        dht._log(errMsg)
        throw errcode(new Error(errMsg), 'ERR_INVALID_RECORD')
      }

      return { record, peers }
    }

    if (peers.length > 0) {
      return { peers }
    }

    throw errcode(new Error('Not found'), 'ERR_NOT_FOUND')
  },

  /**
   * Get a value via rpc call for the given parameters.
   *
   * @param {PeerId} peer
   * @param {Buffer} key
   * @param {function(Error, Message)} callback
   * @returns {void}
   *
   * @private
   */

  _getValueSingle (peer, key, callback) {
    promiseToCallback(this._getValueSingleAsync(peer, key))(callback)
  },

  async _getValueSingleAsync (peer, key) { // eslint-disable-line require-await
    const msg = new Message(Message.TYPES.GET_VALUE, key, 0)
    return promisify(cb => dht.network.sendRequest(peer, msg, cb))()
  },

  /**
   * Verify a record, fetching missing public keys from the network.
   * Calls back with an error if the record is invalid.
   *
   * @param {Record} record
   * @param {function(Error)} callback
   * @returns {void}
   *
   * @private
   */

  _verifyRecordOnline (record, callback) {
    promiseToCallback(this._verifyRecordOnlineAsync(record))(err => callback(err))
  },

  async _verifyRecordOnlineAsync (record) {
    await promisify(cb => libp2pRecord.validator.verifyRecord(dht.validators, record, cb))()
  },

  /**
   * Get the public key directly from a node.
   *
   * @param {PeerId} peer
   * @param {function(Error, PublicKey)} callback
   * @returns {void}
   *
   * @private
   */

  _getPublicKeyFromNode (peer, callback) {
    promiseToCallback(this._getPublicKeyFromNodeAsync(peer))(callback)
  },

  async _getPublicKeyFromNodeAsync (peer) {
    const pkKey = utils.keyForPublicKey(peer)
    // const msg = await dht._getValueSingleAsync(peer, pkKey)
    const msg = await promisify(cb => dht._getValueSingle(peer, pkKey, cb))()

    if (!msg.record || !msg.record.value) {
      throw errcode(`Node not responding with its public key: ${peer.toB58String()}`, 'ERR_INVALID_RECORD')
    }

    const recPeer = await promisify(cb => PeerId.createFromPubKey(msg.record.value, cb))()

    // compare hashes of the pub key
    if (!recPeer.isEqual(peer)) {
      throw errcode('public key does not match id', 'ERR_PUBLIC_KEY_DOES_NOT_MATCH_ID')
    }

    return recPeer.pubKey
  },

  /**
   * Search the dht for up to `n` providers of the given CID.
   *
   * @param {CID} key
   * @param {number} providerTimeout - How long the query should maximally run in milliseconds.
   * @param {number} n
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {void}
   *
   * @private
   */
  _findNProviders (key, providerTimeout, n, callback) {
    promiseToCallback(this._findNProvidersAsync(key, providerTimeout, n))(callback)
  },

  async _findNProvidersAsync (key, providerTimeout, n) {
    const out = new LimitedPeerList(n)

    const provs = await dht.providers.getProviders(key)

    provs.forEach((id) => {
      let info
      if (dht.peerBook.has(id)) {
        info = dht.peerBook.get(id)
      } else {
        info = dht.peerBook.put(new PeerInfo(id))
      }
      out.push(info)
    })

    // All done
    if (out.length >= n) {
      return out.toArray()
    }

    // need more, query the network
    const paths = []
    const query = new Query(dht, key.buffer, (pathIndex, numPaths) => {
      // This function body runs once per disjoint path
      const pathSize = utils.pathSize(n - out.length, numPaths)
      const pathProviders = new LimitedPeerList(pathSize)
      paths.push(pathProviders)

      // Here we return the query function to use on this particular disjoint path
      return async (peer) => {
        const msg = await dht._findProvidersSingleAsync(peer, key)
        const provs = msg.providerPeers
        dht._log('(%s) found %s provider entries', dht.peerInfo.id.toB58String(), provs.length)

        provs.forEach((prov) => {
          pathProviders.push(dht.peerBook.put(prov))
        })

        // hooray we have all that we want
        if (pathProviders.length >= pathSize) {
          return { pathComplete: true }
        }

        // it looks like we want some more
        return { closerPeers: msg.closerPeers }
      }
    })

    const peers = dht.routingTable.closestPeers(key.buffer, dht.kBucketSize)

    try {
      await promisify(callback => timeout((cb) => {
        promiseToCallback(query.run(peers))(cb)
      }, providerTimeout)(callback))()
    } catch (err) {
      if (err.code !== 'ETIMEDOUT') {
        throw err
      }
    } finally {
      query.stop()
    }

    // combine peers from each path
    paths.forEach((path) => {
      path.toArray().forEach((peer) => {
        out.push(peer)
      })
    })

    if (out.length === 0) {
      throw errcode(new Error('no providers found'), 'ERR_NOT_FOUND')
    }

    return out.toArray()
  },

  /**
   * Check for providers from a single node.
   *
   * @param {PeerId} peer
   * @param {CID} key
   * @param {function(Error, Message)} callback
   * @returns {void}
   *
   * @private
   */
  _findProvidersSingle (peer, key, callback) {
    promiseToCallback(this._findProvidersSingleAsync(peer, key))(callback)
  },

  async _findProvidersSingleAsync (peer, key) { // eslint-disable-line require-await
    const msg = new Message(Message.TYPES.GET_PROVIDERS, key.buffer, 0)
    return promisify(cb => dht.network.sendRequest(peer, msg, cb))()
  }
})

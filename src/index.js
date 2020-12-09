'use strict'

const { EventEmitter } = require('events')
const errcode = require('err-code')

const libp2pRecord = require('libp2p-record')
const { MemoryDatastore } = require('interface-datastore')
const uint8ArrayEquals = require('uint8arrays/equals')

const RoutingTable = require('./routing')
const utils = require('./utils')
const c = require('./constants')
const Network = require('./network')
const contentFetching = require('./content-fetching')
const contentRouting = require('./content-routing')
const peerRouting = require('./peer-routing')
const Message = require('./message')
const Providers = require('./providers')
const RandomWalk = require('./random-walk')
const QueryManager = require('./query-manager')

const Record = libp2pRecord.Record

/**
 * A DHT implementation modeled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class KadDHT extends EventEmitter {
  /**
   * Random walk options
   * @typedef {Object} randomWalkOptions
   * @property {boolean} enabled discovery enabled (default: true)
   * @property {number} queriesPerPeriod how many queries to run per period (default: 1)
   * @property {number} interval how often to run the the random-walk process, in milliseconds (default: 300000)
   * @property {number} timeout how long to wait for the the random-walk query to run, in milliseconds (default: 30000)
   * @property {number} delay how long to wait before starting the first random walk, in milliseconds (default: 10000)
   */

  /**
   * Create a new KadDHT.
   * @param {Object} props
   * @param {Libp2p} [props.libp2p] the libp2p instance
   * @param {Dialer} props.dialer libp2p dialer instance
   * @param {PeerId} props.peerId peer's peerId
   * @param {PeerStore} props.peerStore libp2p peerStore
   * @param {Object} props.registrar libp2p registrar instance
   * @param {function} props.registrar.handle
   * @param {function} props.registrar.register
   * @param {function} props.registrar.unregister
   * @param {string} [props.protocolPrefix = '/ipfs'] libp2p registrar handle protocol
   * @param {boolean} [props.forceProtocolLegacy = false] WARNING: this is not recommended and should only be used for legacy purposes
   * @param {number} props.kBucketSize k-bucket size (default 20)
   * @param {boolean} props.clientMode If true, the DHT will not respond to queries. This should be true if your node will not be dialable. (default: false)
   * @param {number} props.concurrency alpha concurrency of queries (default 3)
   * @param {Datastore} props.datastore datastore (default MemoryDatastore)
   * @param {object} props.validators validators object with namespace as keys and function(key, record, callback)
   * @param {object} props.selectors selectors object with namespace as keys and function(key, records)
   * @param {randomWalkOptions} options.randomWalk randomWalk options
   * @param {function(record: Record, peerId: PeerId)} [props.onPut = () => {}] Called when an entry is added to or changed in the datastore
   * @param {function(record: Record)} [props.onRemove = () => {}] Called when an entry is removed from the datastore
   */
  constructor ({
    libp2p,
    dialer,
    peerId,
    peerStore,
    registrar,
    protocolPrefix = '/ipfs',
    forceProtocolLegacy = false,
    datastore = new MemoryDatastore(),
    kBucketSize = c.K,
    clientMode = false,
    concurrency = c.ALPHA,
    validators = {},
    selectors = {},
    randomWalk = {},
    onPut = () => {},
    onRemove = () => {}
  }) {
    super()

    if (!dialer) {
      throw new Error('libp2p-kad-dht requires an instance of Dialer')
    }

    /**
     * Local reference to the libp2p instance. May be undefined.
     * @type {Libp2p}
     */
    this.libp2p = libp2p

    /**
     * Local reference to the libp2p dialer instance
     * @type {Dialer}
     */
    this.dialer = dialer

    /**
     * Local peer-id
     * @type {PeerId}
     */
    this.peerId = peerId

    /**
     * Local PeerStore
     * @type {PeerStore}
     */
    this.peerStore = peerStore

    /**
     * Local peer info
     * @type {Registrar}
     */
    this.registrar = registrar

    /**
     * Registrar protocol
     * @type {string}
     */
    this.protocol = protocolPrefix + (forceProtocolLegacy ? '' : c.PROTOCOL_DHT)

    /**
     * k-bucket size
     *
     * @type {number}
     */
    this.kBucketSize = kBucketSize

    this._clientMode = clientMode

    /**
     * ALPHA concurrency at which each query path with run, defaults to 3
     * @type {number}
     */
    this.concurrency = concurrency

    /**
     * Number of disjoint query paths to use
     * This is set to `kBucketSize`/2 per the S/Kademlia paper
     * @type {number}
     */
    this.disjointPaths = Math.ceil(this.kBucketSize / 2)

    /**
     * The routing table.
     *
     * @type {RoutingTable}
     */
    this.routingTable = new RoutingTable(this.peerId, this.kBucketSize)

    /**
     * Reference to the datastore, uses an in-memory store if none given.
     *
     * @type {Datastore}
     */
    this.datastore = datastore

    /**
     * Provider management
     *
     * @type {Providers}
     */
    this.providers = new Providers(this.datastore, this.peerId)

    this.validators = {
      pk: libp2pRecord.validator.validators.pk,
      ...validators
    }

    this.selectors = {
      pk: libp2pRecord.selection.selectors.pk,
      ...selectors
    }

    this.network = new Network(this)

    this._log = utils.logger(this.peerId)

    /**
     * Random walk management
     *
     * @type {RandomWalk}
     */
    this.randomWalk = new RandomWalk(this, randomWalk)

    /**
     * Keeps track of running queries
     *
     * @type {QueryManager}
     */
    this._queryManager = new QueryManager()

    this._running = false

    // DHT components
    this.contentFetching = contentFetching(this)
    this.contentRouting = contentRouting(this)
    this.peerRouting = peerRouting(this)

    // datastore events
    this.onPut = onPut
    this.onRemove = onRemove
  }

  /**
   * Is this DHT running.
   * @type {bool}
   */
  get isStarted () {
    return this._running
  }

  /**
   * Start listening to incoming connections.
   * @returns {Promise<void>}
   */
  async start () {
    this._running = true
    this.providers.start()
    this._queryManager.start()
    await this.network.start()

    // Start random walk, it will not run if it's disabled
    this.randomWalk.start()
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   * @returns {Promise<void>}
   */
  stop () {
    this._running = false
    this.randomWalk.stop()
    this.providers.stop()
    this._queryManager.stop()
    return this.network.stop()
  }

  /**
   * Store the given key/value  pair in the DHT.
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   * @param {Object} [options] - put options
   * @param {number} [options.minPeers] - minimum number of peers required to successfully put (default: closestPeers.length)
   * @returns {Promise<void>}
   */
  async put (key, value, options = {}) { // eslint-disable-line require-await
    return this.contentFetching.put(key, value, options)
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute by default.
   * @param {Uint8Array} key
   * @param {Object} [options] - get options
   * @param {number} [options.timeout] - optional timeout (default: 60000)
   * @returns {Promise<Uint8Array>}
   */
  async get (key, options = {}) { // eslint-disable-line require-await
    return this.contentFetching.get(key, options)
  }

  /**
   * Get the `n` values to the given key without sorting.
   * @param {Uint8Array} key
   * @param {number} nvals
   * @param {Object} [options] - get options
   * @param {number} [options.timeout] - optional timeout (default: 60000)
   * @returns {Promise<Array<{from: PeerId, val: Uint8Array}>>}
   */
  async getMany (key, nvals, options = {}) { // eslint-disable-line require-await
    return this.contentFetching.getMany(key, nvals, options)
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value.
   * @param {CID} key
   * @returns {Promise<void>}
   */
  async provide (key) { // eslint-disable-line require-await
    return this.contentRouting.provide(key)
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   * @param {CID} key
   * @param {Object} options - findProviders options
   * @param {number} options.timeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @param {number} options.maxNumProviders - maximum number of providers to find
   * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async * findProviders (key, options = {}) {
    for await (const peerData of this.contentRouting.findProviders(key, options)) {
      yield peerData
    }
  }

  // ----------- Peer Routing -----------

  /**
   * Search for a peer with the given ID.
   *
   * @param {PeerId} id
   * @param {Object} options - findPeer options
   * @param {number} options.timeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async findPeer (id, options = {}) { // eslint-disable-line require-await
    return this.peerRouting.findPeer(id, options)
  }

  /**
   * Kademlia 'node lookup' operation.
   * @param {Uint8Array} key
   * @param {Object} [options]
   * @param {boolean} [options.shallow] shallow query (default: false)
   * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async * getClosestPeers (key, options = { shallow: false }) {
    for await (const pId of this.peerRouting.getClosestPeers(key, options)) {
      yield pId
    }
  }

  /**
   * Get the public key for the given peer id.
   * @param {PeerId} peer
   * @returns {Promise<PubKey>}
   */
  async getPublicKey (peer) { // eslint-disable-line require-await
    return this.peerRouting.getPublicKey(peer)
  }

  // ----------- Discovery -----------

  _peerDiscovered (peerId, multiaddrs) {
    this.emit('peer', {
      id: peerId,
      multiaddrs
    })
  }

  // ----------- Internals -----------

  /**
   * Returns the routing tables closest peers, for the key of
   * the message.
   *
   * @param {Message} msg
   * @returns {Promise<Array<{ id: PeerId, multiaddrs: Multiaddr[] }>>}
   * @private
   */
  async _nearestPeersToQuery (msg) {
    const key = await utils.convertBuffer(msg.key)
    const ids = this.routingTable.closestPeers(key, this.kBucketSize)

    return ids.map((p) => {
      const peer = this.peerStore.get(p)

      return {
        id: p,
        multiaddrs: peer ? peer.addresses.map((address) => address.multiaddr) : []
      }
    })
  }

  /**
   * Get the nearest peers to the given query, but iff closer
   * than self.
   *
   * @param {Message} msg
   * @param {PeerId} peerId
   * @returns {Promise<Array<{ id: PeerId, multiaddrs: Multiaddr[] }>>}
   * @private
   */
  async _betterPeersToQuery (msg, peerId) {
    this._log('betterPeersToQuery')
    const closer = await this._nearestPeersToQuery(msg)

    return closer.filter((closer) => {
      if (this._isSelf(closer.id)) {
        // Should bail, not sure
        this._log.error('trying to return self as closer')
        return false
      }

      return !closer.id.isEqual(peerId)
    })
  }

  /**
   * Try to fetch a given record by from the local datastore.
   * Returns the record iff it is still valid, meaning
   * - it was either authored by this node, or
   * - it was received less than `MAX_RECORD_AGE` ago.
   *
   * @param {Uint8Array} key
   * @returns {Promise<Record>}
   * @private
   */

  async _checkLocalDatastore (key) {
    this._log('checkLocalDatastore: %b', key)
    const dsKey = utils.bufferToKey(key)

    // Fetch value from ds
    let rawRecord
    try {
      rawRecord = await this.datastore.get(dsKey)
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
      await this.datastore.delete(dsKey)
      this.onRemove(record)
      return undefined
    }

    // Record is valid
    return record
  }

  /**
   * Add the peer to the routing table and update it in the peerStore.
   * @param {PeerId} peerId
   * @returns {Promise<void>}
   * @private
   */
  async _add (peerId) {
    await this.routingTable.add(peerId)
  }

  /**
   * Verify a record without searching the DHT.
   *
   * @param {Record} record
   * @returns {Promise<void>}
   * @private
   */

  async _verifyRecordLocally (record) {
    this._log('verifyRecordLocally')

    await libp2pRecord.validator.verifyRecord(this.validators, record)
  }

  /**
   * Is the given peer id our PeerId?
   *
   * @param {PeerId} other
   * @returns {bool}
   *
   * @private
   */

  _isSelf (other) {
    return other && uint8ArrayEquals(this.peerId.id, other.id)
  }

  /**
   * Store the given key/value pair at the peer `target`.
   *
   * @param {Uint8Array} key
   * @param {Uint8Array} rec - encoded record
   * @param {PeerId} target
   * @returns {Promise<void>}
   *
   * @private
   */

  async _putValueToPeer (key, rec, target) {
    const msg = new Message(Message.TYPES.PUT_VALUE, key, 0)
    msg.record = rec

    const resp = await this.network.sendRequest(target, msg)

    if (!resp.record.value.equals(Record.deserialize(rec).value)) {
      throw errcode(new Error('value not put correctly'), 'ERR_PUT_VALUE_INVALID')
    }
  }

  /**
   * Query a particular peer for the value for the given key.
   * It will either return the value or a list of closer peers.
   *
   * Note: The peerStore is updated with new addresses found for the given peer.
   *
   * @param {PeerId} peer
   * @param {Uint8Array} key
   * @returns {Promise<{Record, Array<{ id: PeerId, multiaddrs: Multiaddr[] }}>}
   * @private
   */

  async _getValueOrPeers (peer, key) {
    const msg = await this._getValueSingle(peer, key)

    const peers = msg.closerPeers
    const record = msg.record

    if (record) {
      // We have a record
      try {
        await this._verifyRecordOnline(record)
      } catch (err) {
        const errMsg = 'invalid record received, discarded'
        this._log(errMsg)
        throw errcode(new Error(errMsg), 'ERR_INVALID_RECORD')
      }

      return { record, peers }
    }

    if (peers.length > 0) {
      return { peers }
    }

    throw errcode(new Error('Not found'), 'ERR_NOT_FOUND')
  }

  /**
   * Get a value via rpc call for the given parameters.
   *
   * @param {PeerId} peer
   * @param {Uint8Array} key
   * @returns {Promise<Message>}
   * @private
   */

  async _getValueSingle (peer, key) { // eslint-disable-line require-await
    const msg = new Message(Message.TYPES.GET_VALUE, key, 0)
    return this.network.sendRequest(peer, msg)
  }

  /**
   * Verify a record, fetching missing public keys from the network.
   * Calls back with an error if the record is invalid.
   *
   * @param {Record} record
   * @returns {Promise<void>}
   * @private
   */

  async _verifyRecordOnline (record) {
    await libp2pRecord.validator.verifyRecord(this.validators, record)
  }
}

module.exports = KadDHT
module.exports.multicodec = '/ipfs' + c.PROTOCOL_DHT

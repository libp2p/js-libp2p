'use strict'

const { EventEmitter } = require('events')
const crypto = require('libp2p-crypto')
const libp2pRecord = require('libp2p-record')
const { MemoryDatastore } = require('datastore-core/memory')
const { RoutingTable } = require('./routing-table')
const { RoutingTableRefresh } = require('./routing-table/refresh')
const utils = require('./utils')
const {
  K,
  QUERY_SELF_INTERVAL,
  RECORD_KEY_PREFIX
} = require('./constants')
const { Network } = require('./network')
const { ContentFetching } = require('./content-fetching')
const { ContentRouting } = require('./content-routing')
const { PeerRouting } = require('./peer-routing')
const { Providers } = require('./providers')
const { QueryManager } = require('./query/manager')
const { RPC } = require('./rpc')
const { TopologyListener } = require('./topology-listener')
const { QuerySelf } = require('./query-self')
const {
  removePrivateAddresses,
  removePublicAddresses
} = require('./utils')
const { KeyTransformDatastore } = require('datastore-core')
const { Key } = require('interface-datastore/key')

/**
 * @typedef {import('libp2p')} Libp2p
 * @typedef {import('libp2p/src/peer-store')} PeerStore
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('libp2p/src/dialer')} Dialer
 * @typedef {import('libp2p/src/registrar')} Registrar
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('./types').DHT} DHT
 * @typedef {import('./types').PeerData} PeerData
 * @typedef {import('./types').QueryEvent} QueryEvent
 * @typedef {import('./types').SendingQueryEvent} SendingQueryEvent
 * @typedef {import('./types').PeerResponseEvent} PeerResponseEvent
 * @typedef {import('./types').FinalPeerEvent} FinalPeerEvent
 * @typedef {import('./types').QueryErrorEvent} QueryErrorEvent
 * @typedef {import('./types').ProviderEvent} ProviderEvent
 * @typedef {import('./types').ValueEvent} ValueEvent
 * @typedef {import('./types').AddingPeerEvent} AddingPeerEvent
 * @typedef {import('./types').DialingPeerEvent} DialingPeerEvent
 *
 * @typedef {object} KadDHTOps
 * @property {Libp2p} libp2p - the libp2p instance
 * @property {string} [protocol = '/ipfs/kad/1.0.0'] - libp2p registrar handle protocol
 * @property {number} kBucketSize - k-bucket size (default 20)
 * @property {boolean} clientMode - If true, the DHT will not respond to queries. This should be true if your node will not be dialable. (default: false)
 * @property {import('libp2p-interfaces/src/types').DhtValidators} validators - validators object with namespace as keys and function(key, record, callback)
 * @property {object} selectors - selectors object with namespace as keys and function(key, records)
 * @property {number} querySelfInterval - how often to search the network for peers close to ourselves
 * @property {boolean} lan
 * @property {PeerData[]} bootstrapPeers
 */

class PrefixTransform {
  /**
   *
   * @param {string} prefix - : ;
   */
  constructor (prefix) {
    this._prefix = prefix

    if (this._prefix.startsWith('/')) {
      this._prefix = this._prefix.substring(1)
    }
  }

  /**
   * @param {Key} key
   */
  convert (key) {
    return new Key(`/${this._prefix}${key}`)
  }

  /**
   * @param {Key} key
   */
  invert (key) {
    const namespaces = key.namespaces()

    if (namespaces[0] === this._prefix) {
      namespaces.shift()
    }

    return Key.withNamespaces(namespaces)
  }
}

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class KadDHT extends EventEmitter {
  /**
   * Create a new KadDHT.
   *
   * @param {KadDHTOps} opts
   */
  constructor ({
    libp2p,
    kBucketSize = K,
    clientMode = true,
    validators = {},
    selectors = {},
    querySelfInterval = QUERY_SELF_INTERVAL,
    lan = true,
    protocol = '/ipfs/lan/kad/1.0.0',
    bootstrapPeers = []
  }) {
    super()

    this._running = false
    this._log = utils.logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}`)

    /**
     * Local reference to the libp2p instance
     *
     * @type {Libp2p}
     */
    this._libp2p = libp2p

    /**
     * Registrar protocol
     *
     * @type {string}
     */
    this._protocol = protocol

    /**
     * k-bucket size
     *
     * @type {number}
     */
    this._kBucketSize = kBucketSize

    /**
     * Whether we are in client or server mode
     */
    this._clientMode = clientMode

    /**
     * Will be added to the routing table on startup
     */
    this._bootstrapPeers = bootstrapPeers

    /**
     * The routing table.
     *
     * @type {RoutingTable}
     */
    this._routingTable = new RoutingTable({
      peerId: libp2p.peerId,
      dialer: libp2p,
      kBucketSize,
      metrics: libp2p.metrics,
      lan
    })

    const datastore = libp2p.datastore || new MemoryDatastore()
    const records = new KeyTransformDatastore(datastore, new PrefixTransform(RECORD_KEY_PREFIX))

    /**
     * Provider management
     *
     * @type {Providers}
     */
    this._providers = new Providers({
      providers: datastore
    })

    /**
     * @type {boolean}
     */
    this._lan = lan

    this._validators = {
      pk: libp2pRecord.validator.validators.pk,
      ...validators
    }

    this._selectors = {
      pk: libp2pRecord.selection.selectors.pk,
      ...selectors
    }

    this._network = new Network({
      dialer: libp2p,
      protocol: this._protocol,
      lan
    })
    /**
     * Keeps track of running queries
     *
     * @type {QueryManager}
     */
    this._queryManager = new QueryManager({
      peerId: libp2p.peerId,
      // Number of disjoint query paths to use - This is set to `kBucketSize/2` per the S/Kademlia paper
      disjointPaths: Math.ceil(kBucketSize / 2),
      metrics: libp2p.metrics,
      lan
    })

    // DHT components
    this._peerRouting = new PeerRouting({
      peerId: libp2p.peerId,
      routingTable: this._routingTable,
      peerStore: libp2p.peerStore,
      network: this._network,
      validators: this._validators,
      queryManager: this._queryManager,
      lan
    })
    this._contentFetching = new ContentFetching({
      peerId: libp2p.peerId,
      records,
      validators: this._validators,
      selectors: this._selectors,
      peerRouting: this._peerRouting,
      queryManager: this._queryManager,
      routingTable: this._routingTable,
      network: this._network,
      lan
    })
    this._contentRouting = new ContentRouting({
      peerId: libp2p.peerId,
      network: this._network,
      peerRouting: this._peerRouting,
      queryManager: this._queryManager,
      routingTable: this._routingTable,
      providers: this._providers,
      peerStore: libp2p.peerStore,
      lan
    })
    this._routingTableRefresh = new RoutingTableRefresh({
      peerRouting: this._peerRouting,
      routingTable: this._routingTable,
      lan
    })
    this._rpc = new RPC({
      routingTable: this._routingTable,
      peerId: libp2p.peerId,
      providers: this._providers,
      peerStore: libp2p.peerStore,
      addressable: libp2p,
      peerRouting: this._peerRouting,
      records,
      validators: this._validators,
      lan
    })
    this._topologyListener = new TopologyListener({
      registrar: libp2p.registrar,
      protocol: this._protocol,
      lan
    })
    this._querySelf = new QuerySelf({
      peerId: libp2p.peerId,
      peerRouting: this._peerRouting,
      interval: querySelfInterval,
      lan
    })

    // handle peers being discovered during processing of DHT messages
    this._network.on('peer', (peerData) => {
      this.onPeerConnect(peerData).catch(err => {
        this._log.error(`could not add ${peerData.id} to routing table`, err)
      })

      this.emit('peer', peerData)
    })

    // handle peers being discovered via other peer discovery mechanisms
    this._topologyListener.on('peer', async (peerId) => {
      const peerData = {
        id: peerId,
        multiaddrs: (this._libp2p.peerStore.addressBook.get(peerId) || []).map((/** @type {{ multiaddr: Multiaddr }} */ addr) => addr.multiaddr)
      }

      this.onPeerConnect(peerData).catch(err => {
        this._log.error(`could not add ${peerData.id} to routing table`, err)
      })
    })
  }

  /**
   * @param {PeerData} peerData
   */
  async onPeerConnect (peerData) {
    this._log('peer %p connected', peerData.id)

    if (this._lan) {
      peerData = removePublicAddresses(peerData)
    } else {
      peerData = removePrivateAddresses(peerData)
    }

    if (!peerData.multiaddrs.length) {
      this._log('ignoring %p as they do not have any %s addresses in %s', peerData.id, this._lan ? 'private' : 'public', peerData.multiaddrs.map(addr => addr.toString()))
      return
    }

    try {
      await this._routingTable.add(peerData.id)
    } catch (/** @type {any} */ err) {
      this._log.error('could not add %p to routing table', peerData.id, err)
    }
  }

  /**
   * Is this DHT running.
   */
  isStarted () {
    return this._running
  }

  /**
   * Is this DHT in server mode
   */
  isServer () {
    return !this._clientMode
  }

  /**
   * Whether we are in client or server mode
   */
  enableServerMode () {
    this._log('enabling server mode')
    this._clientMode = false
    this._libp2p.handle(this._protocol, this._rpc.onIncomingStream.bind(this._rpc))
  }

  /**
   * Whether we are in client or server mode
   */
  enableClientMode () {
    this._log('enabling client mode')
    this._clientMode = true
    this._libp2p.unhandle(this._protocol)
  }

  /**
   * Start listening to incoming connections.
   */
  async start () {
    this._running = true

    // Only respond to queries when not in client mode
    if (this._clientMode) {
      this.enableClientMode()
    } else {
      this.enableServerMode()
    }

    await Promise.all([
      this._providers.start(),
      this._queryManager.start(),
      this._network.start(),
      this._routingTable.start(),
      this._topologyListener.start(),
      this._querySelf.start()
    ])

    await Promise.all(
      this._bootstrapPeers.map(peerData => this._routingTable.add(peerData.id))
    )

    await this._routingTableRefresh.start()
    await this.refreshRoutingTable()
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop () {
    this._running = false

    await Promise.all([
      this._providers.stop(),
      this._queryManager.stop(),
      this._network.stop(),
      this._routingTable.stop(),
      this._routingTableRefresh.stop(),
      this._topologyListener.stop(),
      this._querySelf.stop()
    ])
  }

  /**
   * Store the given key/value pair in the DHT
   *
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   * @param {object} [options] - put options
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.minPeers] - minimum number of peers required to successfully put (default: closestPeers.length)
   */
  async * put (key, value, options = {}) { // eslint-disable-line require-await
    yield * this._contentFetching.put(key, value, options)
  }

  /**
   * Get the value that corresponds to the passed key
   *
   * @param {Uint8Array} key
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * get (key, options = {}) { // eslint-disable-line require-await
    yield * this._contentFetching.get(key, options)
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value
   *
   * @param {CID} key
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async * provide (key, options = {}) { // eslint-disable-line require-await
    yield * this._contentRouting.provide(key, this._libp2p.multiaddrs, options)
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   *
   * @param {CID} key
   * @param {object} [options] - findProviders options
   * @param {number} [options.maxNumProviders=5] - maximum number of providers to find
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * findProviders (key, options = { maxNumProviders: 5 }) {
    yield * this._contentRouting.findProviders(key, options)
  }

  // ----------- Peer Routing -----------

  /**
   * Search for a peer with the given ID
   *
   * @param {PeerId} id
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * findPeer (id, options = {}) { // eslint-disable-line require-await
    yield * this._peerRouting.findPeer(id, options)
  }

  /**
   * Kademlia 'node lookup' operation.
   *
   * @param {Uint8Array} key
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * getClosestPeers (key, options = {}) {
    yield * this._peerRouting.getClosestPeers(key, options)
  }

  /**
   * Get the public key for the given peer id
   *
   * @param {PeerId} peer
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async getPublicKey (peer, options = {}) {
    this._log('getPublicKey %p', peer)

    // try the node directly
    for await (const event of this._peerRouting.getPublicKeyFromNode(peer, options)) {
      if (event.name === 'VALUE') {
        return crypto.keys.unmarshalPublicKey(event.value)
      }
    }

    // search the dht
    const pkKey = utils.keyForPublicKey(peer)

    for await (const event of this.get(pkKey, options)) {
      if (event.name === 'VALUE') {
        return crypto.keys.unmarshalPublicKey(event.value)
      }
    }
  }

  async refreshRoutingTable () {
    await this._routingTableRefresh.refreshTable(true)
  }
}

module.exports = {
  KadDHT
}

'use strict'

const { EventEmitter } = require('events')
const PeerId = require('peer-id')
const utils = require('./utils')
const errCode = require('err-code')
const merge = require('it-merge')
const { queryErrorEvent } = require('./query/events')

const log = utils.logger('libp2p:kad-dht')

/**
 * @typedef {import('libp2p')} Libp2p
 * @typedef {import('libp2p/src/peer-store')} PeerStore
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('libp2p/src/dialer')} Dialer
 * @typedef {import('libp2p/src/registrar')} Registrar
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('./kad-dht').KadDHT} KadDHT
 * @typedef {import('./types').DHT} DHT
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
 */

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class DualKadDHT extends EventEmitter {
  /**
   * Create a new KadDHT.
   *
   * @param {KadDHT} wan
   * @param {KadDHT} lan
   * @param {Libp2p} libp2p
   */
  constructor (wan, lan, libp2p) {
    super()

    this._wan = wan
    this._lan = lan
    this._libp2p = libp2p

    // handle peers being discovered during processing of DHT messages
    this._wan.on('peer', (peerData) => {
      this.emit('peer', peerData)
    })
    this._lan.on('peer', (peerData) => {
      this.emit('peer', peerData)
    })
  }

  /**
   * Is this DHT running.
   */
  isStarted () {
    return this._wan.isStarted() && this._lan.isStarted()
  }

  /**
   * Whether we are in client or server mode
   */
  async enableServerMode () {
    await this._wan.enableServerMode()
  }

  /**
   * Whether we are in client or server mode
   */
  async enableClientMode () {
    await this._wan.enableClientMode()
  }

  /**
   * Start listening to incoming connections.
   */
  async start () {
    await Promise.all([
      this._lan.start(),
      this._wan.start()
    ])
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop () {
    await Promise.all([
      this._lan.stop(),
      this._wan.stop()
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
    let counterAll = 0
    let counterSuccess = 0

    for await (const event of merge(
      this._lan.put(key, value, options),
      this._wan.put(key, value, options)
    )) {
      yield event

      if (event.name === 'SENDING_QUERY' && event.messageName === 'PUT_VALUE') {
        counterAll++
      }

      if (event.name === 'PEER_RESPONSE' && event.messageName === 'PUT_VALUE') {
        counterSuccess++
      }
    }

    // Ensure we have a default `minPeers`
    const minPeers = options.minPeers == null ? counterAll || 1 : options.minPeers

    // verify if we were able to put to enough peers
    if (counterSuccess < minPeers) {
      const error = errCode(new Error(`Failed to put value to enough peers: ${counterSuccess}/${minPeers}`), 'ERR_NOT_ENOUGH_PUT_PEERS')
      log.error(error)
      throw error
    }
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
    let queriedPeers = false
    let foundValue = false

    for await (const event of merge(
      this._lan.get(key, options),
      this._wan.get(key, options)
    )) {
      yield event

      if (event.name === 'DIALING_PEER') {
        queriedPeers = true
      }

      if (event.name === 'VALUE') {
        queriedPeers = true

        if (event.value != null) {
          foundValue = true
        }
      }

      if (event.name === 'SENDING_QUERY') {
        queriedPeers = true
      }
    }

    if (!queriedPeers) {
      throw errCode(new Error('No peers found in routing table!'), 'ERR_NO_PEERS_IN_ROUTING_TABLE')
    }

    if (!foundValue) {
      yield queryErrorEvent({
        from: this._libp2p.peerId,
        error: errCode(new Error('Not found'), 'ERR_NOT_FOUND')
      })
    }
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
    let sent = 0
    let success = 0
    const errors = []

    const dhts = [this._lan]

    // only run provide on the wan if we are in server mode
    if (this._wan.isServer()) {
      dhts.push(this._wan)
    }

    for await (const event of merge(...dhts.map(dht => dht.provide(key, options)))) {
      yield event

      if (event.name === 'SENDING_QUERY') {
        sent++
      }

      if (event.name === 'QUERY_ERROR') {
        errors.push(event.error)
      }

      if (event.name === 'PEER_RESPONSE' && event.messageName === 'ADD_PROVIDER') {
        log('sent provider record for %s to %p', key, event.from.id)
        success++
      }
    }

    if (success === 0) {
      if (errors.length) {
        // if all sends failed, throw an error to inform the caller
        throw errCode(new Error(`Failed to provide to ${errors.length} of ${sent} peers`), 'ERR_PROVIDES_FAILED', { errors })
      }

      throw errCode(new Error('Failed to provide - no peers found'), 'ERR_PROVIDES_FAILED')
    }
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
    yield * merge(
      this._lan.findProviders(key, options),
      this._wan.findProviders(key, options)
    )
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
    let queriedPeers = false

    for await (const event of merge(
      this._lan.findPeer(id, options),
      this._wan.findPeer(id, options)
    )) {
      yield event

      if (event.name === 'SENDING_QUERY' || event.name === 'FINAL_PEER') {
        queriedPeers = true
      }
    }

    if (!queriedPeers) {
      throw errCode(new Error('Peer lookup failed'), 'ERR_LOOKUP_FAILED')
    }
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
    yield * merge(
      this._lan.getClosestPeers(key, options),
      this._wan.getClosestPeers(key, options)
    )
  }

  /**
   * Get the public key for the given peer id
   *
   * @param {PeerId} peer
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async getPublicKey (peer, options = {}) {
    log('getPublicKey %p', peer)

    // local check
    const peerData = await this._libp2p.peerStore.get(peer)

    if (peerData && peerData.id.pubKey) {
      log('getPublicKey: found local copy')
      return peerData.id.pubKey
    }

    // try the node directly
    const pks = await Promise.all([
      this._lan.getPublicKey(peer, options),
      this._wan.getPublicKey(peer, options)
    ])

    if (pks[0] && pks[1] && !pks[0].equals(pks[1])) {
      throw errCode(new Error('Inconsistent public key loaded from wan and lan DHTs'), 'ERR_FAILED_TO_LOAD_KEY')
    }

    const pk = pks[0] || pks[1]

    if (!pk) {
      throw errCode(new Error('Failed to load public key'), 'ERR_FAILED_TO_LOAD_KEY')
    }

    const peerId = new PeerId(peer.id, undefined, pk)
    const addrs = ((peerData && peerData.addresses) || []).map((address) => address.multiaddr)
    await this._libp2p.peerStore.addressBook.add(peerId, addrs)
    await this._libp2p.peerStore.keyBook.set(peerId, pk)

    return pk
  }

  async refreshRoutingTable () {
    await Promise.all([
      this._lan.refreshRoutingTable(),
      this._wan.refreshRoutingTable()
    ])
  }
}

module.exports = {
  DualKadDHT
}

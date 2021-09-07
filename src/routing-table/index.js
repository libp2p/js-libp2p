'use strict'

// @ts-ignore
const KBuck = require('k-bucket')
const { xor: uint8ArrayXor } = require('uint8arrays/xor')
const GENERATED_PREFIXES = require('./generated-prefix-list.json')
const { sha256 } = require('multiformats/hashes/sha2')
const crypto = require('libp2p-crypto')
const PeerId = require('peer-id')
const utils = require('../utils')
const debug = require('debug')
const log = Object.assign(debug('libp2p:dht:routing-table'), {
  error: debug('libp2p:dht:routing-table:error')
})
// @ts-ignore
const length = require('it-length')

/**
 * @typedef {object} KBucketPeer
 * @property {Uint8Array} id
 * @property {PeerId} peer
 *
 * @typedef {object} KBucket
 * @property {Uint8Array} id
 * @property {KBucketPeer[]} contacts
 * @property {boolean} dontSplit
 * @property {KBucket} left
 * @property {KBucket} right
 *
 * @typedef {object} KBucketTree
 * @property {KBucket} root
 * @property {Uint8Array} localNodeId
 * @property {(event: string, callback: Function) => void} on
 * @property {(key: Uint8Array, count: number) => KBucketPeer[]} closest
 * @property {(key: Uint8Array) => KBucketPeer} closestPeer
 * @property {(key: Uint8Array) => void} remove
 * @property {(peer: KBucketPeer) => void} add
 * @property {() => number} count
 * @property {() => Iterable<KBucket>} toIterable
 */

/**
 * Cannot generate random KadIds longer than this + 1
 */
const MAX_COMMON_PREFIX_LENGTH = 15

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
class RoutingTable {
  /**
   * @param {import('../')} dht
   * @param {object} [options]
   * @param {number} [options.kBucketSize=20]
   * @param {number} [options.refreshInterval=30000]
   */
  constructor (dht, { kBucketSize, refreshInterval } = {}) {
    this.peerId = dht.peerId
    this.dht = dht
    this._kBucketSize = kBucketSize || 20
    this._refreshInterval = refreshInterval || 30000

    /** @type {KBucketTree} */
    this.kb = new KBuck({
      numberOfNodesPerKBucket: this._kBucketSize,
      numberOfNodesToPing: 1
    })

    /** @type {Date[]} */
    this.commonPrefixLengthRefreshedAt = []

    this._refreshTable = this._refreshTable.bind(this)
    this._onPing = this._onPing.bind(this)
  }

  async start () {
    this.kb.localNodeId = await utils.convertPeerId(this.peerId)
    this.kb.on('ping', this._onPing)

    await this._refreshTable(true)
  }

  async stop () {
    if (this._refreshTimeoutId) {
      clearTimeout(this._refreshTimeoutId)
    }
  }

  /**
   * To speed lookups, we seed the table with random PeerIds. This means
   * when we are asked to locate a peer on the network, we can find a KadId
   * that is close to the requested peer ID and query that, then network
   * peers will tell us who they know who is close to the fake ID
   *
   * @param {boolean} [force=false]
   */
  async _refreshTable (force) {
    log('refreshing routing table')

    const prefixLength = this._maxCommonPrefix()
    const refreshCpls = this._getTrackedCommonPrefixLengthsForRefresh(prefixLength)

    log(`max common prefix length ${prefixLength}`)
    log(`tracked CPLs [ ${refreshCpls.map(date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`).join(', ')} ]`)

    /**
     * If we see a gap at a common prefix length in the Routing table, we ONLY refresh up until
     * the maximum cpl we have in the Routing Table OR (2 * (Cpl+ 1) with the gap), whichever
     * is smaller.
     *
     * This is to prevent refreshes for Cpls that have no peers in the network but happen to be
     * before a very high max Cpl for which we do have peers in the network.
     *
     * The number of 2 * (Cpl + 1) can be proved and a proof would have been written here if
     * the programmer had paid more attention in the Math classes at university.
     *
     * So, please be patient and a doc explaining it will be published soon.
     *
     * https://github.com/libp2p/go-libp2p-kad-dht/commit/2851c88acb0a3f86bcfe3cfd0f4604a03db801d8#diff-ad45f4ba97ffbc4083c2eb87a4420c1157057b233f048030d67c6b551855ccf6R219
     */
    await Promise.all(
      refreshCpls.map(async (lastRefresh, index) => {
        try {
          await this._refreshCommonPrefixLength(index, lastRefresh, force === true)

          if (this._numPeersForCpl(prefixLength) === 0) {
            const lastCpl = Math.min(2 * (index + 1), refreshCpls.length - 1)

            for (let n = index + 1; n < lastCpl + 1; n++) {
              try {
                await this._refreshCommonPrefixLength(n, lastRefresh, force === true)
              } catch (err) {
                log.error(err)
              }
            }
          }
        } catch (err) {
          log.error(err)
        }
      })
    )

    this._refreshTimeoutId = setTimeout(this._refreshTable, this._refreshInterval)
    // @ts-ignore
    this._refreshTimeoutId.unref()
  }

  /**
   * @param {number} cpl
   * @param {Date} lastRefresh
   * @param {boolean} force
   */
  async _refreshCommonPrefixLength (cpl, lastRefresh, force) {
    if (!force && lastRefresh.getTime() > (Date.now() - this._refreshInterval)) {
      log(`not running refresh for cpl ${cpl} as time since last refresh not above interval`)
      return
    }

    // gen a key for the query to refresh the cpl
    const peerId = await this._generateRandomPeerId(cpl)

    log(`starting refreshing cpl ${cpl} with key ${peerId.toB58String()} (routing table size was ${this.kb.count()})`)

    const peers = await length(this.dht.getClosestPeers(peerId.toBytes(), {}))

    log(`found ${peers} peers that were close to imaginary peer ${peerId.toB58String()}`)

    log(`finished refreshing cpl ${cpl} with key ${peerId.toB58String()} (routing table size was ${this.kb.count()})`)
  }

  /**
   * @param {number} maxCommonPrefix
   */
  _getTrackedCommonPrefixLengthsForRefresh (maxCommonPrefix) {
    if (maxCommonPrefix > MAX_COMMON_PREFIX_LENGTH) {
      maxCommonPrefix = MAX_COMMON_PREFIX_LENGTH
    }

    const dates = []

    for (let i = 0; i <= maxCommonPrefix; i++) {
      // defaults to the zero value if we haven't refreshed it yet.
      dates[i] = this.commonPrefixLengthRefreshedAt[i] || new Date()
    }

    return dates
  }

  /**
   *
   * @param {number} targetCommonPrefixLength
   */
  async _generateRandomPeerId (targetCommonPrefixLength) {
    const randomBytes = crypto.randomBytes(2)
    const randomUint16 = (randomBytes[1] << 8) + randomBytes[0]

    const key = await this._makePeerId(this.kb.localNodeId, randomUint16, targetCommonPrefixLength)

    return PeerId.createFromBytes(key)
  }

  /**
   * @param {Uint8Array} localKadId
   * @param {number} randomPrefix
   * @param {number} targetCommonPrefixLength
   */
  async _makePeerId (localKadId, randomPrefix, targetCommonPrefixLength) {
    if (targetCommonPrefixLength > MAX_COMMON_PREFIX_LENGTH) {
      throw new Error(`Cannot generate peer ID for common prefix length greater than ${MAX_COMMON_PREFIX_LENGTH}`)
    }

    const view = new DataView(localKadId.buffer, localKadId.byteOffset, localKadId.byteLength)
    const localPrefix = view.getUint16(0, false)

    // For host with ID `L`, an ID `K` belongs to a bucket with ID `B` ONLY IF CommonPrefixLen(L,K) is EXACTLY B.
    // Hence, to achieve a targetPrefix `T`, we must toggle the (T+1)th bit in L & then copy (T+1) bits from L
    // to our randomly generated prefix.
    const toggledLocalPrefix = localPrefix ^ (0x8000 >> targetCommonPrefixLength)

    // Combine the toggled local prefix and the random bits at the correct offset
    // such that ONLY the first `targetCommonPrefixLength` bits match the local ID.
    const mask = 65535 << (16 - (targetCommonPrefixLength + 1))
    const targetPrefix = (toggledLocalPrefix & mask) | (randomPrefix & ~mask)

    // Convert to a known peer ID.
    const keyPrefix = GENERATED_PREFIXES[targetPrefix]

    const keyBuffer = new ArrayBuffer(34)
    const keyView = new DataView(keyBuffer, 0, keyBuffer.byteLength)
    keyView.setUint8(0, sha256.code)
    keyView.setUint8(1, 32)
    keyView.setUint32(2, keyPrefix, false)

    return new Uint8Array(keyView.buffer, keyView.byteOffset, keyView.byteLength)
  }

  /**
   * returns the maximum common prefix length between any peer in the table
   * and the current peer
   */
  _maxCommonPrefix () {
    if (!this.kb.localNodeId) {
      return 0
    }

    // xor our KadId with every KadId in the k-bucket tree,
    // return the longest id prefix that is the same
    let prefixLength = 0

    for (const length of this._prefixLengths()) {
      if (length > prefixLength) {
        prefixLength = length
      }
    }

    return prefixLength
  }

  /**
   * Returns the number of peers in the table with a given prefix length
   *
   * @param {number} prefixLength
   */
  _numPeersForCpl (prefixLength) {
    let count = 0

    for (const length of this._prefixLengths()) {
      if (length === prefixLength) {
        count++
      }
    }

    return count
  }

  /**
   * Yields the common prefix length of every peer in the table
   */
  * _prefixLengths () {
    for (const { id } of this.kb.toIterable()) {
      const distance = uint8ArrayXor(this.kb.localNodeId, id)
      let leadingZeros = 0

      for (const byte of distance) {
        if (byte === 0) {
          leadingZeros++
        } else {
          break
        }
      }

      yield leadingZeros
    }
  }

  /**
   * Called on the `ping` event from `k-bucket`.
   * Currently this just removes the oldest contact from
   * the list, without actually pinging the individual peers.
   * This is the same as go does, but should probably
   * be upgraded to actually ping the individual peers.
   *
   * @param {KBucketPeer[]} oldContacts
   * @param {KBucketPeer} newContact
   */
  _onPing (oldContacts, newContact) {
    // just use the first one (k-bucket sorts from oldest to newest)
    const oldest = oldContacts[0]

    if (oldest) {
      // remove the oldest one
      this.kb.remove(oldest.id)
    }

    // add the new one
    this.kb.add(newContact)
  }

  // -- Public Interface

  /**
   * Amount of currently stored peers.
   */
  get size () {
    return this.kb.count()
  }

  /**
   * Find a specific peer by id.
   *
   * @param {PeerId} peer
   */
  async find (peer) {
    const key = await utils.convertPeerId(peer)
    const closest = this.closestPeer(key)

    if (closest && peer.equals(closest)) {
      return closest
    }
  }

  /**
   * Retrieve the closest peers to the given key.
   *
   * @param {Uint8Array} key
   */
  closestPeer (key) {
    const res = this.closestPeers(key, 1)

    if (res.length > 0) {
      return res[0]
    }
  }

  /**
   * Retrieve the `count`-closest peers to the given key.
   *
   * @param {Uint8Array} key
   * @param {number} count
   */
  closestPeers (key, count) {
    const closest = this.kb.closest(key, count)

    return closest.map(p => p.peer)
  }

  /**
   * Add or update the routing table with the given peer.
   *
   * @param {PeerId} peer
   */
  async add (peer) {
    const id = await utils.convertPeerId(peer)

    this.kb.add({ id: id, peer: peer })
  }

  /**
   * Remove a given peer from the table.
   *
   * @param {PeerId} peer
   */
  async remove (peer) {
    const id = await utils.convertPeerId(peer)

    this.kb.remove(id)
  }
}

module.exports = RoutingTable

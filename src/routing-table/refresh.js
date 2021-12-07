'use strict'

const { xor: uint8ArrayXor } = require('uint8arrays/xor')
const GENERATED_PREFIXES = require('./generated-prefix-list.json')
const { sha256 } = require('multiformats/hashes/sha2')
const crypto = require('libp2p-crypto')
const PeerId = require('peer-id')
const utils = require('../utils')
const length = require('it-length')
const { TimeoutController } = require('timeout-abort-controller')
const { TABLE_REFRESH_INTERVAL, TABLE_REFRESH_QUERY_TIMEOUT } = require('../constants')

/**
 * @typedef {import('./types').KBucketPeer} KBucketPeer
 * @typedef {import('./types').KBucket} KBucket
 * @typedef {import('./types').KBucketTree} KBucketTree
 */

/**
 * Cannot generate random KadIds longer than this + 1
 */
const MAX_COMMON_PREFIX_LENGTH = 15

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
class RoutingTableRefresh {
  /**
   * @param {object} params
   * @param {import('../peer-routing').PeerRouting} params.peerRouting
   * @param {import('./').RoutingTable} params.routingTable
   * @param {boolean} params.lan
   * @param {number} [params.refreshInterval]
   * @param {number} [params.refreshQueryTimeout]
   */
  constructor ({ peerRouting, routingTable, refreshInterval, refreshQueryTimeout, lan }) {
    this._log = utils.logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:routing-table:refresh`)
    this._peerRouting = peerRouting
    this._routingTable = routingTable
    this._refreshInterval = refreshInterval || TABLE_REFRESH_INTERVAL
    this._refreshQueryTimeout = refreshQueryTimeout || TABLE_REFRESH_QUERY_TIMEOUT

    /** @type {Date[]} */
    this.commonPrefixLengthRefreshedAt = []

    this.refreshTable = this.refreshTable.bind(this)
  }

  async start () {
    this._log(`refreshing routing table every ${this._refreshInterval}ms`)
    await this.refreshTable(true)
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
  async refreshTable (force) {
    this._log('refreshing routing table')

    const prefixLength = this._maxCommonPrefix()
    const refreshCpls = this._getTrackedCommonPrefixLengthsForRefresh(prefixLength)

    this._log(`max common prefix length ${prefixLength}`)
    this._log(`tracked CPLs [ ${refreshCpls.map(date => date.toISOString()).join(', ')} ]`)

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
              } catch (/** @type {any} */ err) {
                this._log.error(err)
              }
            }
          }
        } catch (/** @type {any} */ err) {
          this._log.error(err)
        }
      })
    )

    this._refreshTimeoutId = setTimeout(this.refreshTable, this._refreshInterval)

    // @ts-ignore
    if (this._refreshTimeoutId.unref) {
      // @ts-ignore
      this._refreshTimeoutId.unref()
    }
  }

  /**
   * @param {number} cpl
   * @param {Date} lastRefresh
   * @param {boolean} force
   */
  async _refreshCommonPrefixLength (cpl, lastRefresh, force) {
    if (!force && lastRefresh.getTime() > (Date.now() - this._refreshInterval)) {
      this._log('not running refresh for cpl %s as time since last refresh not above interval', cpl)
      return
    }

    // gen a key for the query to refresh the cpl
    const peerId = await this._generateRandomPeerId(cpl)

    this._log('starting refreshing cpl %s with key %p (routing table size was %s)', cpl, peerId, this._routingTable.kb.count())

    const controller = new TimeoutController(this._refreshQueryTimeout)

    try {
      const peers = await length(this._peerRouting.getClosestPeers(peerId.toBytes(), { signal: controller.signal }))

      this._log(`found ${peers} peers that were close to imaginary peer %p`, peerId)
      this._log('finished refreshing cpl %s with key %p (routing table size is now %s)', cpl, peerId, this._routingTable.kb.count())
    } finally {
      controller.clear()
    }
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

    const key = await this._makePeerId(this._routingTable.kb.localNodeId, randomUint16, targetCommonPrefixLength)

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
    if (!this._routingTable.kb) {
      return
    }

    for (const { id } of this._routingTable.kb.toIterable()) {
      const distance = uint8ArrayXor(this._routingTable.kb.localNodeId, id)
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
}

module.exports.RoutingTableRefresh = RoutingTableRefresh

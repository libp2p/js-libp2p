import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import GENERATED_PREFIXES from './generated-prefix-list.js'
import { sha256 } from 'multiformats/hashes/sha2'
import { randomBytes } from '@libp2p/crypto'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { logger } from '@libp2p/logger'
import length from 'it-length'
import { TimeoutController } from 'timeout-abort-controller'
import { TABLE_REFRESH_INTERVAL, TABLE_REFRESH_QUERY_TIMEOUT } from '../constants.js'
import type { RoutingTable } from './index.js'
import type { Logger } from '@libp2p/logger'
import type { PeerRouting } from '../peer-routing/index.js'
import type { Components, Initializable } from '@libp2p/components'

/**
 * Cannot generate random KadIds longer than this + 1
 */
const MAX_COMMON_PREFIX_LENGTH = 15

export interface RoutingTableRefreshInit {
  peerRouting: PeerRouting
  routingTable: RoutingTable
  lan: boolean
  refreshInterval?: number
  refreshQueryTimeout?: number
}

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export class RoutingTableRefresh implements Initializable {
  private readonly log: Logger
  private readonly peerRouting: PeerRouting
  private readonly routingTable: RoutingTable
  private readonly refreshInterval: number
  private readonly refreshQueryTimeout: number
  private readonly commonPrefixLengthRefreshedAt: Date[]
  private refreshTimeoutId?: NodeJS.Timer

  constructor (init: RoutingTableRefreshInit) {
    const { peerRouting, routingTable, refreshInterval, refreshQueryTimeout, lan } = init
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:routing-table:refresh`)
    this.peerRouting = peerRouting
    this.routingTable = routingTable
    this.refreshInterval = refreshInterval ?? TABLE_REFRESH_INTERVAL
    this.refreshQueryTimeout = refreshQueryTimeout ?? TABLE_REFRESH_QUERY_TIMEOUT
    this.commonPrefixLengthRefreshedAt = []

    this.refreshTable = this.refreshTable.bind(this)
  }

  init (components: Components): void {

  }

  async start () {
    this.log(`refreshing routing table every ${this.refreshInterval}ms`)
    this.refreshTable(true)
  }

  async stop () {
    if (this.refreshTimeoutId != null) {
      clearTimeout(this.refreshTimeoutId)
    }
  }

  /**
   * To speed lookups, we seed the table with random PeerIds. This means
   * when we are asked to locate a peer on the network, we can find a KadId
   * that is close to the requested peer ID and query that, then network
   * peers will tell us who they know who is close to the fake ID
   */
  refreshTable (force: boolean = false) {
    this.log('refreshing routing table')

    const prefixLength = this._maxCommonPrefix()
    const refreshCpls = this._getTrackedCommonPrefixLengthsForRefresh(prefixLength)

    this.log(`max common prefix length ${prefixLength}`)
    this.log(`tracked CPLs [ ${refreshCpls.map(date => date.toISOString()).join(', ')} ]`)

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
    Promise.all(
      refreshCpls.map(async (lastRefresh, index) => {
        try {
          await this._refreshCommonPrefixLength(index, lastRefresh, force)

          if (this._numPeersForCpl(prefixLength) === 0) {
            const lastCpl = Math.min(2 * (index + 1), refreshCpls.length - 1)

            for (let n = index + 1; n < lastCpl + 1; n++) {
              try {
                await this._refreshCommonPrefixLength(n, lastRefresh, force)
              } catch (err: any) {
                this.log.error(err)
              }
            }
          }
        } catch (err: any) {
          this.log.error(err)
        }
      })
    ).catch(err => {
      this.log.error(err)
    }).then(() => {
      this.refreshTimeoutId = setTimeout(this.refreshTable, this.refreshInterval)

      if (this.refreshTimeoutId.unref != null) {
        this.refreshTimeoutId.unref()
      }
    }).catch(err => {
      this.log.error(err)
    })
  }

  async _refreshCommonPrefixLength (cpl: number, lastRefresh: Date, force: boolean) {
    if (!force && lastRefresh.getTime() > (Date.now() - this.refreshInterval)) {
      this.log('not running refresh for cpl %s as time since last refresh not above interval', cpl)
      return
    }

    // gen a key for the query to refresh the cpl
    const peerId = await this._generateRandomPeerId(cpl)

    this.log('starting refreshing cpl %s with key %p (routing table size was %s)', cpl, peerId, this.routingTable.size)

    const controller = new TimeoutController(this.refreshQueryTimeout)

    try {
      const peers = await length(this.peerRouting.getClosestPeers(peerId.toBytes(), { signal: controller.signal }))

      this.log(`found ${peers} peers that were close to imaginary peer %p`, peerId)
      this.log('finished refreshing cpl %s with key %p (routing table size is now %s)', cpl, peerId, this.routingTable.size)
    } finally {
      controller.clear()
    }
  }

  _getTrackedCommonPrefixLengthsForRefresh (maxCommonPrefix: number) {
    if (maxCommonPrefix > MAX_COMMON_PREFIX_LENGTH) {
      maxCommonPrefix = MAX_COMMON_PREFIX_LENGTH
    }

    const dates = []

    for (let i = 0; i <= maxCommonPrefix; i++) {
      // defaults to the zero value if we haven't refreshed it yet.
      dates[i] = this.commonPrefixLengthRefreshedAt[i] ?? new Date()
    }

    return dates
  }

  async _generateRandomPeerId (targetCommonPrefixLength: number) {
    if (this.routingTable.kb == null) {
      throw new Error('Routing table not started')
    }

    const randomData = randomBytes(2)
    const randomUint16 = (randomData[1] << 8) + randomData[0]

    const key = await this._makePeerId(this.routingTable.kb.localNodeId, randomUint16, targetCommonPrefixLength)

    return peerIdFromBytes(key)
  }

  async _makePeerId (localKadId: Uint8Array, randomPrefix: number, targetCommonPrefixLength: number) {
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
   */
  _numPeersForCpl (prefixLength: number) {
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
    if (this.routingTable.kb == null) {
      return
    }

    for (const { id } of this.routingTable.kb.toIterable()) {
      const distance = uint8ArrayXor(this.routingTable.kb.localNodeId, id)
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

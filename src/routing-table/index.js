'use strict'

// @ts-expect-error no types
const KBuck = require('k-bucket')
const utils = require('../utils')
const { default: Queue } = require('p-queue')
const { PROTOCOL_DHT } = require('../constants')
const { TimeoutController } = require('timeout-abort-controller')

/**
 * @typedef {import('./types').KBucketPeer} KBucketPeer
 * @typedef {import('./types').KBucket} KBucket
 * @typedef {import('./types').KBucketTree} KBucketTree
 * @typedef {import('peer-id')} PeerId
 */

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
class RoutingTable {
  /**
   * @param {object} params
   * @param {import('peer-id')} params.peerId
   * @param {import('../types').Dialer} params.dialer
   * @param {boolean} params.lan
   * @param {number} [params.kBucketSize=20]
   * @param {number} [params.pingTimeout=10000]
   */
  constructor ({ peerId, dialer, kBucketSize, pingTimeout, lan }) {
    this._log = utils.logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:routing-table`)
    this._peerId = peerId
    this._dialer = dialer
    this._kBucketSize = kBucketSize || 20
    this._pingTimeout = pingTimeout || 10000

    /** @type {KBucketTree} */
    this.kb = new KBuck({
      numberOfNodesPerKBucket: this._kBucketSize,
      numberOfNodesToPing: 1
    })

    /** @type {Date[]} */
    this.commonPrefixLengthRefreshedAt = []

    this._onPing = this._onPing.bind(this)
    this._pingQueue = new Queue({ concurrency: 1 })
  }

  async start () {
    this.kb.localNodeId = await utils.convertPeerId(this._peerId)
    this.kb.on('ping', this._onPing)
  }

  async stop () {
    this._pingQueue.clear()
  }

  /**
   * Called on the `ping` event from `k-bucket` when a bucket is full
   * and cannot split.
   *
   * `oldContacts.length` is defined by the `numberOfNodesToPing` param
   * passed to the `k-bucket` constructor.
   *
   * `oldContacts` will not be empty and is the list of contacts that
   * have not been contacted for the longest.
   *
   * @param {KBucketPeer[]} oldContacts
   * @param {KBucketPeer} newContact
   */
  _onPing (oldContacts, newContact) {
    // add to a queue so multiple ping requests do not overlap and we don't
    // flood the network with ping requests if lots of newContact requests
    // are received
    this._pingQueue.add(async () => {
      let responded = 0

      try {
        await Promise.all(
          oldContacts.map(async oldContact => {
            let timeoutController

            try {
              timeoutController = new TimeoutController(this._pingTimeout)
              this._log(`pinging old contact ${oldContact.peer}`)
              const { stream } = await this._dialer.dialProtocol(oldContact.peer, PROTOCOL_DHT, {
                signal: timeoutController.signal
              })
              await stream.close()
              responded++
            } catch (/** @type {any} */ err) {
              this._log.error('could not ping peer %p', oldContact.peer, err)
              this._log(`evicting old contact after ping failed ${oldContact.peer}`)
              this.kb.remove(oldContact.id)
            } finally {
              if (timeoutController) {
                timeoutController.clear()
              }
            }
          })
        )

        if (responded < oldContacts.length) {
          this._log(`adding new contact ${newContact.peer}`)
          this.kb.add(newContact)
        }
      } catch (/** @type {any} */ err) {
        this._log.error('could not process k-bucket ping event', err)
      }
    })
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
   * @param {number} [count] - defaults to kBucketSize
   */
  closestPeers (key, count = this._kBucketSize) {
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

    this._log('added %p with kad id %b', peer, id)
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

module.exports.RoutingTable = RoutingTable

'use strict'

// @ts-ignore
const Heap = require('heap')
const { xor: uint8ArrayXor } = require('uint8arrays/xor')
const debug = require('debug')

const utils = require('../utils')

const log = debug('libp2p:dht:peer-queue')

/**
 * @typedef {import('peer-id')} PeerId
 */

/**
 * PeerQueue is a heap that sorts its entries (PeerIds) by their
 * xor distance to the inital provided key.
 */
class PeerQueue {
  /**
   * Create from a given peer id.
   *
   * @param {PeerId} id
   * @returns {Promise<PeerQueue>}
   */
  static async fromPeerId (id) {
    const key = await utils.convertPeerId(id)

    return new PeerQueue(key)
  }

  /**
   * Create from a given Uint8Array.
   *
   * @param {Uint8Array} keyBuffer
   * @returns {Promise<PeerQueue>}
   */
  static async fromKey (keyBuffer) {
    const key = await utils.convertBuffer(keyBuffer)

    return new PeerQueue(key)
  }

  /**
   * Create a new PeerQueue.
   *
   * @param {Uint8Array} from - The sha2-256 encoded peer id
   */
  constructor (from) {
    log('create: %b', from)
    this.from = from
    this.heap = new Heap(utils.xorCompare)
  }

  /**
   * Add a new PeerId to the queue.
   *
   * @param {PeerId} id
   */
  async enqueue (id) {
    log('enqueue %s', id.toB58String())
    const key = await utils.convertPeerId(id)

    const el = {
      id: id,
      distance: uint8ArrayXor(this.from, key)
    }

    this.heap.push(el)
  }

  /**
   * Returns the closest peer to the `from` peer.
   *
   * @returns {PeerId}
   */
  dequeue () {
    const el = this.heap.pop()
    log('dequeue %s', el.id.toB58String())
    return el.id
  }

  get length () {
    return this.heap.size()
  }
}

module.exports = PeerQueue

'use strict'

const Heap = require('heap')
const distance = require('xor-distance')
const debug = require('debug')

const utils = require('./utils')

const log = debug('libp2p:dht:peer-queue')

/**
 * PeerQueue is a heap that sorts its entries (PeerIds) by their
 * xor distance to the inital provided key.
 */
class PeerQueue {
  /**
   * Create from a given peer id.
   *
   * @param {PeerId} id
   * @param {function(Error, PeerQueue)} callback
   * @returns {void}
   */
  static fromPeerId (id, callback) {
    utils.convertPeerId(id, (err, key) => {
      if (err) {
        return callback(err)
      }

      callback(null, new PeerQueue(key))
    })
  }

  /**
   * Create from a given buffer.
   *
   * @param {Buffer} key
   * @param {function(Error, PeerQueue)} callback
   * @returns {void}
   */
  static fromKey (key, callback) {
    utils.convertBuffer(key, (err, key) => {
      if (err) {
        return callback(err)
      }

      callback(null, new PeerQueue(key))
    })
  }

  /**
   * Create a new PeerQueue.
   *
   * @param {Buffer} from - The sha2-256 encoded peer id
   */
  constructor (from) {
    log('create: %s', from.toString('hex'))
    this.from = from
    this.heap = new Heap(utils.xorCompare)
  }

  /**
   * Add a new PeerId to the queue.
   *
   * @param {PeerId} id
   * @param {function(Error)} callback
   * @returns {void}
   */
  enqueue (id, callback) {
    log('enqueue %s', id.id.toString('hex'))
    utils.convertPeerId(id, (err, key) => {
      if (err) {
        return callback(err)
      }

      const el = {
        id: id,
        distance: distance(this.from, key)
      }

      this.heap.push(el)
      callback()
    })
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

'use strict'

const map = require('async/map')
const debug = require('debug')
const once = require('once')

const log = debug('libp2p:swarm:dialer')

const DialQueue = require('./queue')

/**
 * Track dials per peer and limited them.
 */
class LimitDialer {
  /**
   * Create a new dialer.
   *
   * @param {number} perPeerLimit
   * @param {number} dialTimeout
   */
  constructor (perPeerLimit, dialTimeout) {
    log('create: %s peer limit, %s dial timeout', perPeerLimit, dialTimeout)
    this.perPeerLimit = perPeerLimit
    this.dialTimeout = dialTimeout
    this.queues = new Map()
  }

  /**
   * Dial a list of multiaddrs on the given transport.
   *
   * @param {PeerId} peer
   * @param {SwarmTransport} transport
   * @param {Array<Multiaddr>} addrs
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  dialMany (peer, transport, addrs, callback) {
    log('dialMany:start')
    // we use a token to track if we want to cancel following dials
    const token = { cancel: false }
    callback = once(callback) // only call callback once

    map(addrs, (m, cb) => {
      this.dialSingle(peer, transport, m, token, cb)
    }, (err, results) => {
      if (err) {
        return callback(err)
      }

      const success = results.filter((res) => res.conn)
      if (success.length > 0) {
        log('dialMany:success')
        return callback(null, success[0])
      }

      log('dialMany:error')
      const error = new Error('Failed to dial any provided address')
      error.errors = results
        .filter((res) => res.error)
        .map((res) => res.error)
      return callback(error)
    })
  }

  /**
   * Dial a single multiaddr on the given transport.
   *
   * @param {PeerId} peer
   * @param {SwarmTransport} transport
   * @param {Multiaddr} addr
   * @param {CancelToken} token
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  dialSingle (peer, transport, addr, token, callback) {
    const ps = peer.toB58String()
    log('dialSingle: %s:%s', ps, addr.toString())
    let q
    if (this.queues.has(ps)) {
      q = this.queues.get(ps)
    } else {
      q = new DialQueue(this.perPeerLimit, this.dialTimeout)
      this.queues.set(ps, q)
    }

    q.push(transport, addr, token, callback)
  }
}

module.exports = LimitDialer

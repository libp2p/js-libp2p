'use strict'

const Connection = require('interface-connection').Connection
const pull = require('pull-stream/pull')
const empty = require('pull-stream/sources/empty')
const timeout = require('async/timeout')
const queue = require('async/queue')
const debug = require('debug')
const once = require('once')

const log = debug('libp2p:switch:dialer:queue')
log.error = debug('libp2p:switch:dialer:queue:error')

/**
 * Queue up the amount of dials to a given peer.
 */
class DialQueue {
  /**
   * Create a new dial queue.
   *
   * @param {number} limit
   * @param {number} dialTimeout
   */
  constructor (limit, dialTimeout) {
    this.dialTimeout = dialTimeout

    this.queue = queue((task, cb) => {
      this._doWork(task.transport, task.addr, task.token, cb)
    }, limit)
  }

  /**
   * The actual work done by the queue.
   *
   * @param {SwarmTransport} transport
   * @param {Multiaddr} addr
   * @param {CancelToken} token
   * @param {function(Error, Connection)} callback
   * @returns {void}
   * @private
   */
  _doWork (transport, addr, token, callback) {
    callback = once(callback)
    log('work:start')
    this._dialWithTimeout(transport, addr, (err, conn) => {
      if (err) {
        log.error(`${transport.constructor.name}:work`, err)
        return callback(err)
      }

      if (token.cancel) {
        log('work:cancel')
        // clean up already done dials
        pull(empty(), conn)
        // If we can close the connection, do it
        if (typeof conn.close === 'function') {
          return conn.close((_) => callback(null))
        }
        return callback(null)
      }

      // one is enough
      token.cancel = true

      log('work:success')

      const proxyConn = new Connection()
      proxyConn.setInnerConn(conn)
      callback(null, { multiaddr: addr, conn: conn })
    })
  }

  /**
   * Dial the given transport, timing out with the set timeout.
   *
   * @param {SwarmTransport} transport
   * @param {Multiaddr} addr
   * @param {function(Error, Connection)} callback
   * @returns {void}
   *
   * @private
   */
  _dialWithTimeout (transport, addr, callback) {
    timeout((cb) => {
      const conn = transport.dial(addr, (err) => {
        if (err) {
          return cb(err)
        }

        cb(null, conn)
      })
    }, this.dialTimeout)(callback)
  }

  /**
   * Add new work to the queue.
   *
   * @param {SwarmTransport} transport
   * @param {Multiaddr} addr
   * @param {CancelToken} token
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  push (transport, addr, token, callback) {
    this.queue.push({ transport, addr, token }, callback)
  }
}

module.exports = DialQueue

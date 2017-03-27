'use strict'

const Connection = require('interface-connection').Connection
const parallel = require('async/parallel')
const queue = require('async/queue')
const timeout = require('async/timeout')
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:swarm:transport')

const protocolMuxer = require('./protocol-muxer')

// number of concurrent outbound dials to make per peer, same as go-libp2p-swarm
const defaultPerPeerRateLimit = 8

// the amount of time a single dial has to succeed
const dialTimeout = 10 * 1000

module.exports = function (swarm) {
  const queues = new Map()

  return {
    add (key, transport, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!callback) { callback = noop }
      log('adding %s', key)
      if (swarm.transports[key]) {
        throw new Error('There is already a transport with this key')
      }
      swarm.transports[key] = transport
      if (!swarm.transports[key].listeners) {
        swarm.transports[key].listeners = []
      }

      callback()
    },

    dial (key, multiaddrs, callback) {
      const t = swarm.transports[key]

      if (!Array.isArray(multiaddrs)) {
        multiaddrs = [multiaddrs]
      }
      log('dialing %s', key, multiaddrs.map((m) => m.toString()))
      // filter the multiaddrs that are actually valid for this transport (use a func from the transport itself) (maybe even make the transport do that)
      multiaddrs = dialables(t, multiaddrs)

      // create dial queue if non exists
      let q
      if (queues.has(key)) {
        log('reusing queue')
        q = queues.get(key)
      } else {
        log('setting up new queue')
        q = queue((multiaddr, cb) => {
          dialWithTimeout(t, multiaddr, dialTimeout, (err, conn) => {
            if (err) {
              log('dial err', err)
              return cb(err)
            }

            if (q.canceled) {
              log('dial canceled: %s', multiaddr.toString())
              // clean up already done dials
              if (conn) {
                conn.close()
              }
              return cb()
            }

            // one is enough
            log('dial success: %s', multiaddr.toString())
            q.kill()
            q.canceled = true

            q.finish(null, conn)
          })
        }, defaultPerPeerRateLimit)

        q.errors = []
        q.finishCbs = []

        // handle finish
        q.finish = (err, conn) => {
          log('queue finish')
          queues.delete(key)

          q.finishCbs.forEach((next) => {
            if (err) {
              return next(err)
            }

            const proxyConn = new Connection()
            proxyConn.setInnerConn(conn)

            next(null, proxyConn)
          })
        }

        // collect errors
        q.error = (err) => {
          q.errors.push(err)
        }

        // no more addresses and all failed
        q.drain = () => {
          log('queue drain')
          const err = new Error('Could not dial any address')
          err.errors = q.errors
          q.errors = []
          q.finish(err)
        }

        queues.set(key, q)
      }

      q.push(multiaddrs)
      q.finishCbs.push(callback)
    },

    listen (key, options, handler, callback) {
      // if no handler is passed, we pass conns to protocolMuxer
      if (!handler) {
        handler = protocolMuxer.bind(null, swarm.protocols)
      }

      const multiaddrs = dialables(swarm.transports[key], swarm._peerInfo.distinctMultiaddr())

      const transport = swarm.transports[key]

      if (!transport.listeners) {
        transport.listeners = []
      }

      let freshMultiaddrs = []

      const createListeners = multiaddrs.map((ma) => {
        return (cb) => {
          const done = once(cb)
          const listener = transport.createListener(handler)
          listener.once('error', done)

          listener.listen(ma, (err) => {
            if (err) {
              return done(err)
            }
            listener.removeListener('error', done)
            listener.getAddrs((err, addrs) => {
              if (err) {
                return done(err)
              }
              freshMultiaddrs = freshMultiaddrs.concat(addrs)
              transport.listeners.push(listener)
              done()
            })
          })
        }
      })

      parallel(createListeners, (err) => {
        if (err) {
          return callback(err)
        }

        // cause we can listen on port 0 or 0.0.0.0
        swarm._peerInfo.multiaddr.replace(multiaddrs, freshMultiaddrs)
        callback()
      })
    },

    close (key, callback) {
      const transport = swarm.transports[key]

      if (!transport) {
        return callback(new Error(`Trying to close non existing transport: ${key}`))
      }

      parallel(transport.listeners.map((listener) => {
        return (cb) => {
          listener.close(cb)
        }
      }), callback)
    }
  }
}

function dialables (tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

function dialWithTimeout (transport, multiaddr, maxTimeout, callback) {
  timeout((cb) => {
    const conn = transport.dial(multiaddr, (err) => {
      log('dialed')
      cb(err, conn)
    })
  }, maxTimeout)(callback)
}

function noop () {}

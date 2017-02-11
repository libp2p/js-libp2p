'use strict'

const Connection = require('interface-connection').Connection
const parallel = require('async/parallel')
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:swarm:transport')

const protocolMuxer = require('./protocol-muxer')

module.exports = function (swarm) {
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
      // a) filter the multiaddrs that are actually valid for this transport (use a func from the transport itself) (maybe even make the transport do that)
      multiaddrs = dialables(t, multiaddrs)

      // b) if multiaddrs.length = 1, return the conn from the
      // transport, otherwise, create a passthrough
      if (multiaddrs.length === 1) {
        const conn = t.dial(multiaddrs.shift(), (err) => {
          if (err) return callback(err)
          callback(null, new Connection(conn))
        })
        return
      }

      // c) multiaddrs should already be a filtered list
      // specific for the transport we are using
      const proxyConn = new Connection()

      next(multiaddrs.shift())

      // TODO improve in the future to make all the dials in paralell
      function next (multiaddr) {
        const conn = t.dial(multiaddr, () => {
          proxyConn.setInnerConn(conn)
          callback(null, proxyConn)
        })
      }
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

function noop () {}

'use strict'

const Connection = require('interface-connection').Connection
const parallel = require('run-parallel')
const debug = require('debug')
const log = debug('libp2p:swarm')

const protocolMuxer = require('./protocol-muxer')

module.exports = function (swarm) {
  return {
    add (key, transport, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!callback) { callback = noop }

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

      // a) filter the multiaddrs that are actually valid for this transport (use a func from the transport itself) (maybe even make the transport do that)
      multiaddrs = dialables(t, multiaddrs)

      // b) if multiaddrs.length = 1, return the conn from the
      // transport, otherwise, create a passthrough
      if (multiaddrs.length === 1) {
        const conn = t.dial(multiaddrs.shift())

        conn.once('error', connectError)

        conn.once('connect', () => {
          conn.removeListener('error', connectError)
          callback(null, conn)
        })

        return conn
      }
      function connectError () {
        callback(new Error('failed to connect to every multiaddr'))
      }

      // c) multiaddrs should already be a filtered list
      // specific for the transport we are using
      const proxyConn = new Connection()

      next(multiaddrs.shift())

      return proxyConn

      // TODO improve in the future to make all the dials in paralell
      function next (multiaddr) {
        const conn = t.dial(multiaddr)

        conn.once('error', connectError)

        function connectError () {
          if (multiaddrs.length === 0) {
            return callback(new Error('failed to connect to every multiaddr'))
          }
          next(multiaddrs.shift())
        }

        conn.once('connect', () => {
          conn.removeListener('error', connectError)
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

      const multiaddrs = dialables(swarm.transports[key], swarm._peerInfo.multiaddrs)

      const transport = swarm.transports[key]

      if (!transport.listeners) {
        transport.listeners = []
      }

      let freshMultiaddrs = []

      const createListeners = multiaddrs.map((ma) => {
        return (cb) => {
          const listener = transport.createListener(handler)
          listener.listen(ma, () => {
            log('Listener started on:', ma.toString())
            listener.getAddrs((err, addrs) => {
              if (err) {
                return cb(err)
              }
              freshMultiaddrs = freshMultiaddrs.concat(addrs)
              transport.listeners.push(listener)
              cb()
            })
          })
        }
      })

      parallel(createListeners, () => {
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
  return tp.filter(multiaddrs.map((addr) => {
    // webrtc-star needs the /ipfs/QmHash
    if (addr.toString().indexOf('webrtc-star') > 0) {
      return addr
    }

    return addr
  }))
}
function noop () {}

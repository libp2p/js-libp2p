'use strict'

const connect = require('pull-ws/client')
const mafmt = require('mafmt')
const withIs = require('class-is')
const includes = require('lodash.includes')
const Connection = require('interface-connection').Connection

const maToUrl = require('./ma-to-url')
const debug = require('debug')
const log = debug('libp2p:websockets:dialer')

const createListener = require('./listener')

class WebSockets {
  dial (ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    callback = callback || function () {}

    const url = maToUrl(ma)
    log('dialing %s', url)
    const socket = connect(url, {
      binary: true,
      onConnect: (err) => {
        callback(err)
      }
    })

    const conn = new Connection(socket)
    conn.getObservedAddrs = (cb) => cb(null, [ma])
    conn.close = (cb) => socket.close(cb)

    return conn
  }

  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    return createListener(options, handler)
  }

  filter (multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    return multiaddrs.filter((ma) => {
      if (includes(ma.protoNames(), 'p2p-circuit')) {
        return false
      }

      if (includes(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }

      return mafmt.WebSockets.matches(ma) ||
        mafmt.WebSocketsSecure.matches(ma)
    })
  }
}

module.exports = withIs(WebSockets, { className: 'WebSockets', symbolName: '@libp2p/js-libp2p-websockets/websockets' })

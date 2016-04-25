'use strict'

const debug = require('debug')
const log = debug('libp2p:websockets')
const SWS = require('simple-websocket')
const mafmt = require('mafmt')

exports = module.exports = WebSockets

function WebSockets () {
  if (!(this instanceof WebSockets)) {
    return new WebSockets()
  }

  const listeners = []

  this.dial = function (multiaddr, options) {
    if (!options) {
      options = {}
    }

    options.ready = options.ready || function noop () {}
    const maOpts = multiaddr.toOptions()
    const conn = new SWS('ws://' + maOpts.host + ':' + maOpts.port)
    conn.on('connect', options.ready)
    conn.getObservedAddrs = () => {
      return [multiaddr]
    }
    return conn
  }

  this.createListener = (multiaddrs, options, handler, callback) => {
    if (typeof options === 'function') {
      callback = handler
      handler = options
      options = {}
    }

    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    var count = 0

    multiaddrs.forEach((m) => {
      const listener = SWS.createServer((conn) => {
        conn.getObservedAddrs = () => {
          return [] // TODO think if it makes sense for WebSockets
        }
        handler(conn)
      })

      listener.listen(m.toOptions().port, () => {
        if (++count === multiaddrs.length) {
          callback()
        }
      })
      listeners.push(listener)
    })
  }

  this.close = (callback) => {
    if (listeners.length === 0) {
      log('Called close with no active listeners')
      return callback()
    }
    var count = 0
    listeners.forEach((listener) => {
      listener.close(() => {
        if (++count === listeners.length) {
          callback()
        }
      })
    })
  }

  this.filter = (multiaddrs) => {
    return multiaddrs.filter((ma) => {
      return mafmt.WebSockets.matches(ma)
    })
  }
}

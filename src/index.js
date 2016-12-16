'use strict'

const connect = require('pull-ws/client')
const mafmt = require('mafmt')
const includes = require('lodash.includes')
const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('libp2p:websockets:dialer')

const createListener = require('./listener')

module.exports = class WebSockets {
  dial (ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    if (!callback) {
      callback = () => {}
    }

    const maOpts = ma.toOptions()

    const url = `ws://${maOpts.host}:${maOpts.port}`
    log('dialing %s', url)
    const socket = connect(url, {
      binary: true,
      onConnect: () => callback()
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
      if (includes(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }
      return mafmt.WebSockets.matches(ma)
    })
  }
}

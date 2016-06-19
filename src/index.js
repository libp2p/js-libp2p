'use strict'

const debug = require('debug')
const log = debug('libp2p:websockets')
const SW = require('simple-websocket')
const isNode = require('detect-node')
let SWS
if (isNode) {
  SWS = require('simple-websocket-server')
} else {
  SWS = {}
}
const mafmt = require('mafmt')
const contains = require('lodash.contains')
const Connection = require('interface-connection').Connection

const CLOSE_TIMEOUT = 2000
// const IPFS_CODE = 421

exports = module.exports = WebSockets

function WebSockets () {
  if (!(this instanceof WebSockets)) {
    return new WebSockets()
  }

  this.dial = function (ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    if (!callback) {
      callback = function noop () {}
    }

    const maOpts = ma.toOptions()

    const socket = new SW('ws://' + maOpts.host + ':' + maOpts.port)

    const conn = new Connection(socket)

    socket.on('timeout', () => {
      conn.emit('timeout')
    })

    socket.on('error', (err) => {
      callback(err)
      conn.emit('error', err)
    })

    socket.on('connect', () => {
      callback(null, conn)
      conn.emit('connect')
    })

    conn.getObservedAddrs = (cb) => {
      return cb(null, [ma])
    }

    return conn
  }

  this.createListener = (options, handler) => {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    const listener = SWS.createServer((socket) => {
      const conn = new Connection(socket)

      conn.getObservedAddrs = (cb) => {
        // TODO research if we can reuse the address in anyway
        return cb(null, [])
      }
      handler(conn)
    })

    let listeningMultiaddr

    listener._listen = listener.listen
    listener.listen = (ma, callback) => {
      if (!callback) {
        callback = function noop () {}
      }

      listeningMultiaddr = ma

      if (contains(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }

      listener._listen(ma.toOptions(), callback)
    }

    listener._close = listener.close
    listener.close = (options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = { timeout: CLOSE_TIMEOUT }
      }
      if (!callback) { callback = function noop () {} }
      if (!options) { options = { timeout: CLOSE_TIMEOUT } }

      let closed = false
      listener.once('close', () => {
        closed = true
      })
      listener._close(callback)
      setTimeout(() => {
        if (closed) {
          return
        }
        log('unable to close graciously, destroying conns')
        Object.keys(listener.__connections).forEach((key) => {
          log('destroying %s', key)
          listener.__connections[key].destroy()
        })
      }, options.timeout || CLOSE_TIMEOUT)
    }

    // Keep track of open connections to destroy in case of timeout
    listener.__connections = {}
    listener.on('connection', (socket) => {
      const key = (~~(Math.random() * 1e9)).toString(36) + Date.now()
      listener.__connections[key] = socket

      socket.on('close', () => {
        delete listener.__connections[key]
      })
    })

    listener.getAddrs = (callback) => {
      callback(null, [listeningMultiaddr])
    }

    return listener
  }

  this.filter = (multiaddrs) => {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
    return multiaddrs.filter((ma) => {
      if (contains(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }
      return mafmt.WebSockets.matches(ma)
    })
  }
}

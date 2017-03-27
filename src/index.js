'use strict'

const net = require('net')
const toPull = require('stream-to-pull-stream')
const mafmt = require('mafmt')
const includes = require('lodash.includes')
const isFunction = require('lodash.isfunction')
const Connection = require('interface-connection').Connection
const once = require('once')
const debug = require('debug')
const log = debug('libp2p:tcp:dial')

const createListener = require('./listener')

module.exports = class TCP {
  dial (ma, options, cb) {
    if (isFunction(options)) {
      cb = options
      options = {}
    }

    if (!cb) {
      cb = () => {}
    }

    cb = once(cb)
    const cOpts = ma.toOptions()
    log('Connecting to %s %s', cOpts.port, cOpts.host)

    const rawSocket = net.connect(cOpts)
    rawSocket.once('timeout', () => {
      log('timeout')
      rawSocket.emit('error', new Error('Timeout'))
    })

    rawSocket.once('error', cb)

    rawSocket.once('connect', () => {
      rawSocket.removeListener('error', cb)
      cb()
    })


    const socket = toPull.duplex(rawSocket)

    const conn = new Connection(socket)

    conn.getObservedAddrs = (cb) => {
      return cb(null, [ma])
    }

    return conn
  }

  createListener (options, handler) {
    if (isFunction(options)) {
      handler = options
      options = {}
    }

    handler = handler || (() => {})

    return createListener(handler)
  }

  filter (multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
    return multiaddrs.filter((ma) => {
      if (includes(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }
      return mafmt.TCP.matches(ma)
    })
  }
}

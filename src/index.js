'use strict'

const debug = require('debug')
const log = debug('libp2p:tcp')
const tcp = require('net')
const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6
const mafmt = require('mafmt')
const parallel = require('run-parallel')
const contains = require('lodash.contains')

exports = module.exports = TCP

const IPFS_CODE = 421

function TCP () {
  if (!(this instanceof TCP)) {
    return new TCP()
  }

  const listeners = []

  this.dial = function (multiaddr, options) {
    if (!options) {
      options = {}
    }
    options.ready = options.ready || function noop () {}
    const conn = tcp.connect(multiaddr.toOptions(), options.ready)
    conn.getObservedAddrs = () => {
      return [multiaddr]
    }
    return conn
  }

  this.createListener = (multiaddrs, handler, callback) => {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    const freshMultiaddrs = []

    parallel(multiaddrs.map((m) => (cb) => {
      let ipfsHashId
      if (contains(m.protoNames(), 'ipfs')) {
        ipfsHashId = m.stringTuples().filter((tuple) => {
          if (tuple[0] === IPFS_CODE) {
            return true
          }
        })[0][1]
        m = m.decapsulate('ipfs')
      }

      const listener = tcp.createServer((conn) => {
        conn.getObservedAddrs = () => {
          return [getMultiaddr(conn)]
        }
        handler(conn)
      })
      listener.listen(m.toOptions(), () => {
        // Node.js likes to convert addr to IPv6 (when 0.0.0.0 for e.g)
        const address = listener.address()
        if (m.toString().indexOf('ip4')) {
          m = m.decapsulate('tcp')
          m = m.encapsulate('/tcp/' + address.port)
          if (ipfsHashId) {
            m = m.encapsulate('/ipfs/' + ipfsHashId)
          }
          freshMultiaddrs.push(m)
        }

        if (address.family === 'IPv6') {
          let mh = multiaddr('/ip6/' + address.address + '/tcp/' + address.port)
          if (ipfsHashId) {
            mh = mh.encapsulate('/ipfs/' + ipfsHashId)
          }

          freshMultiaddrs.push(mh)
        }

        cb()
      })
      listeners.push(listener)
    }), (err) => {
      callback(err, freshMultiaddrs)
    })
  }

  this.close = (callback) => {
    if (listeners.length === 0) {
      log('Called close with no active listeners')
      return callback()
    }

    parallel(listeners.map((listener) => {
      return (cb) => listener.close(cb)
    }), callback)
  }

  this.filter = (multiaddrs) => {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
    return multiaddrs.filter((ma) => {
      if (contains(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }
      return mafmt.TCP.matches(ma)
    })
  }
}

function getMultiaddr (conn) {
  var mh

  if (conn.remoteFamily === 'IPv6') {
    var addr = new Address6(conn.remoteAddress)
    if (addr.v4) {
      var ip4 = addr.to4().correctForm()
      mh = multiaddr('/ip4/' + ip4 + '/tcp/' + conn.remotePort)
    } else {
      mh = multiaddr('/ip6/' + conn.remoteAddress + '/tcp/' + conn.remotePort)
    }
  } else {
    mh = multiaddr('/ip4/' + conn.remoteAddress + '/tcp/' + conn.remotePort)
  }

  return mh
}

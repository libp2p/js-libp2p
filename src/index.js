'use strict'

const debug = require('debug')
const log = debug('libp2p:tcp')
const tcp = require('net')
const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6
const mafmt = require('mafmt')
// const parallel = require('run-parallel')
const contains = require('lodash.contains')
const os = require('os')
const Connection = require('interface-connection').Connection

exports = module.exports = TCP

const IPFS_CODE = 421
const CLOSE_TIMEOUT = 2000

function TCP () {
  if (!(this instanceof TCP)) {
    return new TCP()
  }

  this.dial = function (ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    if (!callback) {
      callback = function noop () {}
    }

    const socket = tcp.connect(ma.toOptions())
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

    const listener = tcp.createServer((socket) => {
      const conn = new Connection(socket)

      conn.getObservedAddrs = (cb) => {
        return cb(null, [getMultiaddr(socket)])
      }
      handler(conn)
    })

    let ipfsId
    let listeningMultiaddr

    listener._listen = listener.listen
    listener.listen = (ma, callback) => {
      listeningMultiaddr = ma
      if (contains(ma.protoNames(), 'ipfs')) {
        ipfsId = ma.stringTuples().filter((tuple) => {
          if (tuple[0] === IPFS_CODE) {
            return true
          }
        })[0][1]
        listeningMultiaddr = ma.decapsulate('ipfs')
      }

      listener._listen(listeningMultiaddr.toOptions(), callback)
    }

    listener._close = listener.close
    listener.close = (options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      if (!callback) { callback = function noop () {} }
      if (!options) { options = {} }

      let closed = false
      listener._close(callback)
      listener.once('close', () => {
        closed = true
      })
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
      const key = `${socket.remoteAddress}:${socket.remotePort}`
      listener.__connections[key] = socket

      socket.on('close', () => {
        delete listener.__connections[key]
      })
    })

    listener.getAddrs = (callback) => {
      const multiaddrs = []
      const address = listener.address()

      // Because TCP will only return the IPv6 version
      // we need to capture from the passed multiaddr
      if (listeningMultiaddr.toString().indexOf('ip4') !== -1) {
        let m = listeningMultiaddr.decapsulate('tcp')
        m = m.encapsulate('/tcp/' + address.port)
        if (ipfsId) {
          m = m.encapsulate('/ipfs/' + ipfsId)
        }

        if (m.toString().indexOf('0.0.0.0') !== -1) {
          const netInterfaces = os.networkInterfaces()
          Object.keys(netInterfaces).forEach((niKey) => {
            netInterfaces[niKey].forEach((ni) => {
              if (ni.family === 'IPv4') {
                multiaddrs.push(multiaddr(m.toString().replace('0.0.0.0', ni.address)))
              }
            })
          })
        } else {
          multiaddrs.push(m)
        }
      }

      if (address.family === 'IPv6') {
        let ma = multiaddr('/ip6/' + address.address + '/tcp/' + address.port)
        if (ipfsId) {
          ma = ma.encapsulate('/ipfs/' + ipfsId)
        }

        multiaddrs.push(ma)
      }

      callback(null, multiaddrs)
    }

    return listener
    /*
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
    */
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

function getMultiaddr (socket) {
  var mh

  if (socket.remoteFamily === 'IPv6') {
    var addr = new Address6(socket.remoteAddress)
    if (addr.v4) {
      var ip4 = addr.to4().correctForm()
      mh = multiaddr('/ip4/' + ip4 + '/tcp/' + socket.remotePort)
    } else {
      mh = multiaddr('/ip6/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
    }
  } else {
    mh = multiaddr('/ip4/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
  }

  return mh
}

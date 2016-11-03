'use strict'

const Connection = require('interface-connection').Connection
const contains = require('lodash.contains')

// const IPFS_CODE = 421

let createServer = require('pull-ws/server')

if (!createServer) {
  createServer = () => {}
}

module.exports = (options, handler) => {
  const listener = createServer((socket) => {
    socket.getObservedAddrs = (cb) => {
      // TODO research if we can reuse the address in anyway
      return cb(null, [])
    }

    handler(new Connection(socket))
  })

  let listeningMultiaddr

  listener._listen = listener.listen
  listener.listen = (ma, cb) => {
    cb = cb || (() => {})
    listeningMultiaddr = ma

    if (contains(ma.protoNames(), 'ipfs')) {
      ma = ma.decapsulate('ipfs')
    }

    listener._listen(ma.toOptions(), cb)
  }

  listener.getAddrs = (cb) => {
    cb(null, [listeningMultiaddr])
  }

  return listener
}

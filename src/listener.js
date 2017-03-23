'use strict'

const Connection = require('interface-connection').Connection
const includes = require('lodash.includes')
function noop () {}
const createServer = require('pull-ws/server') || noop

module.exports = (options, handler) => {
  const listener = createServer((socket) => {
    socket.getObservedAddrs = (callback) => {
      // TODO research if we can reuse the address in anyway
      return callback(null, [])
    }

    handler(new Connection(socket))
  })

  let listeningMultiaddr

  listener._listen = listener.listen
  listener.listen = (ma, callback) => {
    callback = callback || noop
    listeningMultiaddr = ma

    if (includes(ma.protoNames(), 'ipfs')) {
      ma = ma.decapsulate('ipfs')
    }

    listener._listen(ma.toOptions(), callback)
  }

  listener.getAddrs = (callback) => {
    callback(null, [listeningMultiaddr])
  }

  return listener
}

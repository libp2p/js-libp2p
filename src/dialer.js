'use strict'
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')

const msg = require('./message')

module.exports = (conn, callback) => {
  pull(
    conn,
    lp.decode(),
    pull.take(1),
    pull.collect((err, data) => {
      if (err) {
        return callback(err)
      }

      const input = msg.decode(data[0])

      const id = PeerId.createFromPubKey(input.publicKey)
      const info = new PeerInfo(id)
      input.listenAddrs
        .map(multiaddr)
        .forEach((ma) => info.multiaddr.add(ma))

      callback(null, info, getObservedAddrs(input))
    })
  )
}

function getObservedAddrs (input) {
  if (!hasObservedAddr(input)) {
    return []
  }

  let addrs = input.observedAddr

  if (!Array.isArray(input.observedAddr)) {
    addrs = [addrs]
  }

  return addrs.map((oa) => multiaddr(oa))
}

function hasObservedAddr (input) {
  return input.observedAddr && input.observedAddr.length > 0
}

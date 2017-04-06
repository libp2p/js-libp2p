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

      // connection got closed graciously
      if (data.length === 0) {
        return callback(new Error('conn was closed, did not receive data'))
      }

      const input = msg.decode(data[0])

      PeerId.createFromPubKey(input.publicKey, (err, id) => {
        if (err) {
          return callback(err)
        }

        const peerInfo = new PeerInfo(id)
        input.listenAddrs
          .map(multiaddr)
          .forEach((ma) => peerInfo.multiaddrs.add(ma))

        callback(null, peerInfo, getObservedAddrs(input))
      })
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

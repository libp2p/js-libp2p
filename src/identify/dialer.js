'use strict'
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const pull = require('pull-stream/pull')
const take = require('pull-stream/throughs/take')
const collect = require('pull-stream/sinks/collect')
const lp = require('pull-length-prefixed')

const msg = require('./message')

module.exports = (conn, expectedPeerInfo, callback) => {
  if (typeof expectedPeerInfo === 'function') {
    callback = expectedPeerInfo
    expectedPeerInfo = null
    // eslint-disable-next-line no-console
    console.warn('WARNING: no expected peer info was given, identify will not be able to verify peer integrity')
  }

  pull(
    conn,
    lp.decode(),
    take(1),
    collect((err, data) => {
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
        if (expectedPeerInfo && expectedPeerInfo.id.toB58String() !== id.toB58String()) {
          return callback(new Error('invalid peer'))
        }

        try {
          input.listenAddrs
            .map(multiaddr)
            .forEach((ma) => peerInfo.multiaddrs.add(ma))
        } catch (err) {
          return callback(err)
        }

        let observedAddr

        try {
          observedAddr = getObservedAddrs(input)
        } catch (err) {
          return callback(err)
        }

        // Copy the protocols
        peerInfo.protocols = new Set(input.protocols)

        callback(null, peerInfo, observedAddr)
      })
    })
  )
}

function getObservedAddrs (input) {
  if (!hasObservedAddr(input)) {
    return []
  }

  let addrs = input.observedAddr

  if (!Array.isArray(addrs)) {
    addrs = [addrs]
  }

  return addrs.map((oa) => multiaddr(oa))
}

function hasObservedAddr (input) {
  return input.observedAddr && input.observedAddr.length > 0
}

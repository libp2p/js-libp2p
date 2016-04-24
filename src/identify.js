/*
 * Identify is one of the protocols swarms speaks in order to
 * broadcast and learn about the ip:port pairs a specific peer
 * is available through and to know when a new stream muxer is
 * established, so a conn can be reused
 */

'use strict'

const multistream = require('multistream-select')
const fs = require('fs')
const path = require('path')
const Info = require('peer-info')
const Id = require('peer-id')
const multiaddr = require('multiaddr')

const identity = fs.readFileSync(path.join(__dirname, 'identify.proto'))

const pbStream = require('protocol-buffers-stream')(identity)

exports = module.exports
exports.multicodec = '/ipfs/identify/1.0.0'

exports.exec = (rawConn, muxer, peerInfo, callback) => {
  // 1. open a stream
  // 2. multistream into identify
  // 3. send what I see from this other peer (extract fro conn)
  // 4. receive what the other peer sees from me
  // 4. callback with (err, peerInfo)

  const conn = muxer.newStream()

  var msI = new multistream.Interactive()
  msI.handle(conn, () => {
    msI.select(exports.multicodec, (err, ds) => {
      if (err) {
        return callback(err)
      }

      var pbs = pbStream()

      pbs.on('identify', (msg) => {
        if (msg.observedAddr.length > 0) {
          peerInfo.multiaddr.addSafe(multiaddr(msg.observedAddr))
        }

        const peerId = Id.createFromPubKey(msg.publicKey)
        const otherPeerInfo = new Info(peerId)
        msg.listenAddrs.forEach((ma) => {
          otherPeerInfo.multiaddr.add(multiaddr(ma))
        })

        callback(null, otherPeerInfo)
      })

      const obsMultiaddr = rawConn.getObservedAddrs()[0]

      pbs.identify({
        protocolVersion: 'na',
        agentVersion: 'na',
        publicKey: peerInfo.id.pubKey,
        listenAddrs: peerInfo.multiaddrs.map((mh) => mh.buffer),
        observedAddr: obsMultiaddr ? obsMultiaddr.buffer : new Buffer('')
      })

      pbs.pipe(ds).pipe(pbs)
      pbs.finalize()
    })
  })
}

exports.handler = (peerInfo, swarm) => {
  return (conn) => {
    // 1. receive incoming observed info about me
    // 2. update my own information (on peerInfo)
    // 3. send back what I see from the other (get from swarm.muxedConns[incPeerID].conn.getObservedAddrs()
    var pbs = pbStream()

    pbs.on('identify', (msg) => {
      if (msg.observedAddr.length > 0) {
        peerInfo.multiaddr.addSafe(multiaddr(msg.observedAddr))
      }

      const peerId = Id.createFromPubKey(msg.publicKey)
      const conn = swarm.muxedConns[peerId.toB58String()].conn
      const obsMultiaddr = conn.getObservedAddrs()[0]

      pbs.identify({
        protocolVersion: 'na',
        agentVersion: 'na',
        publicKey: peerInfo.id.pubKey,
        listenAddrs: peerInfo.multiaddrs.map((ma) => ma.buffer),
        observedAddr: obsMultiaddr ? obsMultiaddr.buffer : new Buffer('')
      })
      pbs.finalize()
    })
    pbs.pipe(conn).pipe(pbs)
  }
}

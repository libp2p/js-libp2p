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
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const bl = require('bl')

const lpstream = require('length-prefixed-stream')
const protobuf = require('protocol-buffers')
const schema = fs.readFileSync(path.join(__dirname, 'identify.proto'))
const idPb = protobuf(schema)

exports = module.exports
exports.multicodec = '/ipfs/id/1.0.0'

exports.exec = (rawConn, muxer, pInfo, callback) => {
  // 1. open a stream
  // 2. multistream into identify
  // 3. send what I see from this other peer (extract fro conn)
  // 4. receive what the other peer sees from me
  // 4. callback with (err, peerInfo)

  const conn = muxer.newStream()

  const ms = new multistream.Dialer()
  ms.handle(conn, (err) => {
    if (err) {
      return callback(err)
    }

    ms.select(exports.multicodec, (err, conn) => {
      if (err) {
        return callback(err)
      }

      const encode = lpstream.encode()
      const decode = lpstream.decode()

      encode
        .pipe(conn)
        .pipe(decode)
        .pipe(bl((err, data) => {
          if (err) {
            return callback(err)
          }
          const msg = idPb.Identify.decode(data)
          if (hasObservedAddr(msg)) {
            pInfo.multiaddr.addSafe(multiaddr(msg.observedAddr))
          }

          const pId = PeerId.createFromPubKey(msg.publicKey)
          const otherPInfo = new PeerInfo(pId)
          msg.listenAddrs.forEach((ma) => {
            otherPInfo.multiaddr.add(multiaddr(ma))
          })
          callback(null, otherPInfo)
        }))

      rawConn.getObservedAddrs((err, addrs) => {
        if (err) {
          return
        }
        const obsMultiaddr = addrs[0]

        let publicKey = new Buffer(0)
        if (pInfo.id.pubKey) {
          publicKey = pInfo.id.pubKey.bytes
        }

        const msg = idPb.Identify.encode({
          protocolVersion: 'na',
          agentVersion: 'na',
          publicKey: publicKey,
          listenAddrs: pInfo.multiaddrs.map((mh) => mh.buffer),
          observedAddr: obsMultiaddr ? obsMultiaddr.buffer : new Buffer('')
        })

        encode.write(msg)
        encode.end()
      })
    })
  })
}

exports.handler = (pInfo, swarm) => {
  return (conn) => {
    // 1. receive incoming observed info about me
    // 2. update my own information (on peerInfo)
    // 3. send back what I see from the other (get from swarm.muxedConns[incPeerID].conn.getObservedAddrs()

    const encode = lpstream.encode()
    const decode = lpstream.decode()

    encode
      .pipe(conn)
      .pipe(decode)
      .pipe(bl((err, data) => {
        if (err) {
          console.log(new Error('Failed to decode lpm from identify'))
          return
        }
        const msg = idPb.Identify.decode(data)
        if (hasObservedAddr(msg)) {
          pInfo.multiaddr.addSafe(multiaddr(msg.observedAddr))
        }

        const pId = PeerId.createFromPubKey(msg.publicKey)
        const conn = swarm.muxedConns[pId.toB58String()].conn
        conn.getObservedAddrs((err, addrs) => {
          if (err) {}
          const obsMultiaddr = addrs[0]

          let publicKey = new Buffer(0)
          if (pInfo.id.pubKey) {
            publicKey = pInfo.id.pubKey.bytes
          }

          const msgSend = idPb.Identify.encode({
            protocolVersion: 'na',
            agentVersion: 'na',
            publicKey: publicKey,
            listenAddrs: pInfo.multiaddrs.map((ma) => ma.buffer),
            observedAddr: obsMultiaddr ? obsMultiaddr.buffer : new Buffer('')
          })

          encode.write(msgSend)
          encode.end()
        })
      }))
  }
}

function hasObservedAddr (msg) {
  return msg.observedAddr && msg.observedAddr.length > 0
}

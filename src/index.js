/*
 * Identify is one of the protocols swarms speaks in order to
 * broadcast and learn about the ip:port pairs a specific peer
 * is available through and to know when a new stream muxer is
 * established, so a conn can be reused
 */

'use strict'

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

exports.exec = (conn, callback) => {
  const decode = lpstream.decode()

  conn
    .pipe(decode)
    .pipe(bl((err, data) => {
      if (err) {
        return callback(err)
      }
      const msg = idPb.Identify.decode(data)
      let observedAddrs = []
      if (hasObservedAddr(msg)) {
        if (!Array.isArray(msg.observedAddr)) {
          msg.observedAddr = [msg.observedAddr]
        }
        observedAddrs = msg.observedAddr.map((oa) => {
          return multiaddr(oa)
        })
      }

      const pId = PeerId.createFromPubKey(msg.publicKey)
      const pInfo = new PeerInfo(pId)
      msg.listenAddrs.forEach((ma) => {
        pInfo.multiaddr.add(multiaddr(ma))
      })

      callback(null, pInfo, observedAddrs)
    }))

  conn.end()
}

exports.handler = (pInfoSelf) => {
  return (conn) => {
    // send what I see from the other + my Info
    const encode = lpstream.encode()

    encode.pipe(conn)

    conn.getObservedAddrs((err, observedAddrs) => {
      if (err) { return }
      observedAddrs = observedAddrs[0]

      let publicKey = new Buffer(0)
      if (pInfoSelf.id.pubKey) {
        publicKey = pInfoSelf.id.pubKey.bytes
      }

      const msgSend = idPb.Identify.encode({
        protocolVersion: 'ipfs/0.1.0',
        agentVersion: 'na',
        publicKey: publicKey,
        listenAddrs: pInfoSelf.multiaddrs.map((ma) => ma.buffer),
        observedAddr: observedAddrs ? observedAddrs.buffer : new Buffer('')
      })

      encode.write(msgSend)
      encode.end()
    })
  }
}

function hasObservedAddr (msg) {
  return msg.observedAddr && msg.observedAddr.length > 0
}

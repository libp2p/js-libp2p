'use strict'

const Connection = require('interface-connection').Connection
const pull = require('pull-stream')

module.exports = (transport, protocol, _conn, observer) => {
  const peerInfo = new Promise((resolve, reject) => {
    _conn.getPeerInfo((err, peerInfo) => {
      if (!err && peerInfo) {
        resolve(peerInfo)
        return
      }

      const setPeerInfo = _conn.setPeerInfo
      _conn.setPeerInfo = (pi) => {
        setPeerInfo.call(_conn, pi)
        resolve(pi)
      }
    })
  })

  const stream = {
    source: pull(
      _conn,
      observer.incoming(transport, protocol, peerInfo)),
    sink: pull(
      observer.outgoing(transport, protocol, peerInfo),
      _conn)
  }
  return new Connection(stream, _conn)
}

'use strict'

const Connection = require('interface-connection').Connection
const pull = require('pull-stream/pull')

/**
 * Creates a pull stream to run the given Connection stream through
 * the given Observer. This provides a way to more easily monitor connections
 * and their metadata. A new Connection will be returned that contains
 * has the attached Observer.
 *
 * @param {Transport} transport
 * @param {string} protocol
 * @param {Connection} connection
 * @param {Observer} observer
 * @returns {Connection}
 */
module.exports = (transport, protocol, connection, observer) => {
  const peerInfo = new Promise((resolve, reject) => {
    connection.getPeerInfo((err, peerInfo) => {
      if (!err && peerInfo) {
        resolve(peerInfo)
        return
      }

      const setPeerInfo = connection.setPeerInfo
      connection.setPeerInfo = (pi) => {
        setPeerInfo.call(connection, pi)
        resolve(pi)
      }
    })
  })

  const stream = {
    source: pull(
      connection,
      observer.incoming(transport, protocol, peerInfo)),
    sink: pull(
      observer.outgoing(transport, protocol, peerInfo),
      connection)
  }

  return new Connection(stream, connection)
}

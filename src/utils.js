'use strict'

const Identify = require('libp2p-identify')

/**
 * For a given multistream, registers to handle the given connection
 * @param {MultistreamDialer} multistream
 * @param {Connection} connection
 * @returns {Promise}
 */
module.exports.msHandle = (multistream, connection) => {
  return new Promise((resolve, reject) => {
    multistream.handle(connection, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

/**
 * For a given multistream, selects the given protocol
 * @param {MultistreamDialer} multistream
 * @param {string} protocol
 * @returns {Promise} Resolves the selected Connection
 */
module.exports.msSelect = (multistream, protocol) => {
  return new Promise((resolve, reject) => {
    multistream.select(protocol, (err, connection) => {
      if (err) return reject(err)
      resolve(connection)
    })
  })
}

/**
 * Runs identify for the given connection and verifies it against the
 * PeerInfo provided
 * @param {Connection} connection
 * @param {PeerInfo} cryptoPeerInfo The PeerInfo determined during crypto exchange
 * @returns {Promise} Resolves {peerInfo, observedAddrs}
 */
module.exports.identifyDialer = (connection, cryptoPeerInfo) => {
  return new Promise((resolve, reject) => {
    Identify.dialer(connection, cryptoPeerInfo, (err, peerInfo, observedAddrs) => {
      if (err) return reject(err)
      resolve({ peerInfo, observedAddrs })
    })
  })
}

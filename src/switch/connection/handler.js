'use strict'

const debug = require('debug')
const IncomingConnection = require('./incoming')
const observeConn = require('../observe-connection')

function listener (_switch) {
  const log = debug('libp2p:switch:listener')

  /**
   * Takes a transport key and returns a connection handler function
   *
   * @param {string} transportKey The key of the transport to handle connections for
   * @param {function} handler A custom handler to use
   * @returns {function(Connection)} A connection handler function
   */
  return function (transportKey, handler) {
    /**
     * Takes a base connection and manages listening behavior
     *
     * @param {Connection} conn The connection to manage
     * @returns {void}
     */
    return function (conn) {
      log('received incoming connection for transport %s', transportKey)
      conn.getPeerInfo((_, peerInfo) => {
        // Add a transport level observer, if needed
        const connection = transportKey ? observeConn(transportKey, null, conn, _switch.observer) : conn
        const connFSM = new IncomingConnection({ connection, _switch, transportKey, peerInfo })

        connFSM.once('error', (err) => log(err))
        connFSM.once('private', (_conn) => {
          // Use the custom handler, if it was provided
          if (handler) {
            return handler(_conn)
          }
          connFSM.encrypt()
        })
        connFSM.once('encrypted', () => connFSM.upgrade())

        connFSM.protect()
      })
    }
  }
}

module.exports = listener

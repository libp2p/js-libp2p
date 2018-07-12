'use strict'

const multistream = require('multistream-select')
const observeConn = require('./observe-connection')

const debug = require('debug')
const log = debug('libp2p:switch:protocol-muxer')

module.exports = function protocolMuxer (protocols, observer) {
  return (transport) => (_parentConn) => {
    const parentConn = transport
      ? observeConn(transport, null, _parentConn, observer)
      : _parentConn

    const ms = new multistream.Listener()

    Object.keys(protocols).forEach((protocol) => {
      if (!protocol) {
        return
      }

      const handler = (protocolName, _conn) => {
        log(`registering handler with protocol ${protocolName}`)
        const protocol = protocols[protocolName]
        if (protocol) {
          const handlerFunc = protocol && protocol.handlerFunc
          if (handlerFunc) {
            const conn = observeConn(null, protocolName, _conn, observer)
            handlerFunc(protocol, conn)
          }
        }
      }

      ms.addHandler(protocol, handler, protocols[protocol].matchFunc)
    })

    ms.handle(parentConn, (err) => {
      if (err) {
        // the multistream handshake failed
      }
    })
  }
}

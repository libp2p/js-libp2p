'use strict'

const multistream = require('multistream-select')
const observeConn = require('./observe-connection')

module.exports = function protocolMuxer (protocols, observer) {
  return (transport) => (_parentConn) => {
    const parentConn = observeConn(transport, null, _parentConn, observer)
    const ms = new multistream.Listener()

    Object.keys(protocols).forEach((protocol) => {
      if (!protocol) {
        return
      }

      const handler = (protocolName, _conn) => {
        const protocol = protocols[protocolName]
        if (protocol) {
          const handlerFunc = protocol && protocol.handlerFunc
          if (handlerFunc) {
            const conn = observeConn(null, protocol, _conn, observer)
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

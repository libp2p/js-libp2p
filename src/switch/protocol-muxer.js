'use strict'

const multistream = require('multistream-select')
const observeConn = require('./observe-connection')

const debug = require('debug')
const log = debug('libp2p:switch:protocol-muxer')
log.error = debug('libp2p:switch:protocol-muxer:error')

module.exports = function protocolMuxer (protocols, observer) {
  return (transport) => (_parentConn, msListener) => {
    const ms = msListener || new multistream.Listener()
    let parentConn

    // Only observe the transport if we have one, and there is not already a listener
    if (transport && !msListener) {
      parentConn = observeConn(transport, null, _parentConn, observer)
    } else {
      parentConn = _parentConn
    }

    Object.keys(protocols).forEach((protocol) => {
      if (!protocol) {
        return
      }

      const handler = (protocolName, _conn) => {
        log('registering handler with protocol %s', protocolName)
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
        log.error('multistream handshake failed', err)
      }
    })
  }
}

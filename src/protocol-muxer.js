'use strict'

const multistream = require('multistream-select')

module.exports = function protocolMuxer (protocols, conn) {
  const ms = new multistream.Listener()

  Object.keys(protocols).forEach((protocol) => {
    if (!protocol) {
      return
    }

    ms.addHandler(protocol, protocols[protocol])
  })

  ms.handle(conn, (err) => {
    if (err) {
      return // the multistream handshake failed
    }
  })
}

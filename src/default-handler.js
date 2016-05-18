'use strict'

const multistream = require('multistream-select')

// incomming connection handler
module.exports = function connHandler (protocols, conn) {
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

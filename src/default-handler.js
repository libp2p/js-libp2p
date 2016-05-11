'use strict'

const multistream = require('multistream-select')

// incomming connection handler
module.exports = function connHandler (protocols, conn) {
  var msS = new multistream.Select()

  Object.keys(protocols).forEach((protocol) => {
    if (!protocol) {
      return
    }

    msS.addHandler(protocol, protocols[protocol])
  })

  msS.handle(conn)
}

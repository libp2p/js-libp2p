'use strict'

const mafmt = require('mafmt')
const {
  CODE_CIRCUIT,
  CODE_P2P,
  CODE_TCP,
  CODE_WS,
  CODE_WSS
} = require('./constants')

module.exports = {
  all: (multiaddrs) => multiaddrs.filter((ma) => {
    if (ma.protoCodes().includes(CODE_CIRCUIT)) {
      return false
    }

    const testMa = ma.decapsulateCode(CODE_P2P)

    return mafmt.WebSockets.matches(testMa) ||
      mafmt.WebSocketsSecure.matches(testMa)
  }),
  dnsWss: (multiaddrs) => multiaddrs.filter((ma) => {
    if (ma.protoCodes().includes(CODE_CIRCUIT)) {
      return false
    }

    const testMa = ma.decapsulateCode(CODE_P2P)

    return mafmt.WebSocketsSecure.matches(testMa) &&
      mafmt.DNS.matches(testMa.decapsulateCode(CODE_TCP).decapsulateCode(CODE_WSS))
  }),
  dnsWsOrWss: (multiaddrs) => multiaddrs.filter((ma) => {
    if (ma.protoCodes().includes(CODE_CIRCUIT)) {
      return false
    }

    const testMa = ma.decapsulateCode(CODE_P2P)

    // WS
    if (mafmt.WebSockets.matches(testMa)) {
      return mafmt.DNS.matches(testMa.decapsulateCode(CODE_TCP).decapsulateCode(CODE_WS))
    }

    // WSS
    return mafmt.WebSocketsSecure.matches(testMa) &&
      mafmt.DNS.matches(testMa.decapsulateCode(CODE_TCP).decapsulateCode(CODE_WSS))
  })
}

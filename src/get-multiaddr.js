'use strict'

const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6
const debug = require('debug')
const log = debug('libp2p:tcp:get-multiaddr')

module.exports = (socket) => {
  let ma

  try {
    if (socket.remoteFamily === 'IPv6') {
      const addr = new Address6(socket.remoteAddress)

      if (addr.v4) {
        const ip4 = addr.to4().correctForm()
        ma = multiaddr('/ip4/' + ip4 +
          '/tcp/' + socket.remotePort
        )
      } else {
        ma = multiaddr('/ip6/' + socket.remoteAddress +
          '/tcp/' + socket.remotePort
        )
      }
    } else {
      ma = multiaddr('/ip4/' + socket.remoteAddress +
        '/tcp/' + socket.remotePort)
    }
  } catch (err) {
    log(err)
  }
  return ma
}

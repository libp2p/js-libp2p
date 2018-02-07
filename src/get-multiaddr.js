'use strict'

const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6

module.exports = (socket) => {
  let ma

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

  return ma
}

'use strict'

const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6

module.exports = (socket) => {
  let mh

  if (socket.remoteFamily === 'IPv6') {
    var addr = new Address6(socket.remoteAddress)
    if (addr.v4) {
      var ip4 = addr.to4().correctForm()
      mh = multiaddr('/ip4/' + ip4 + '/tcp/' + socket.remotePort)
    } else {
      mh = multiaddr('/ip6/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
    }
  } else {
    mh = multiaddr('/ip4/' + socket.remoteAddress + '/tcp/' + socket.remotePort)
  }

  return mh
}

'use strict'

const multiaddr = require('multiaddr')
const { Address4, Address6 } = require('ip-address')

module.exports = (ip, port) => {
  if (typeof ip !== 'string') {
    throw new Error('invalid ip')
  }

  port = parseInt(port)

  if (isNaN(port)) {
    throw new Error('invalid port')
  }

  if (new Address4(ip).isValid()) {
    return multiaddr(`/ip4/${ip}/tcp/${port}`)
  }

  const ip6 = new Address6(ip)

  if (ip6.isValid()) {
    return ip6.is4()
      ? multiaddr(`/ip4/${ip6.to4().correctForm()}/tcp/${port}`)
      : multiaddr(`/ip6/${ip}/tcp/${port}`)
  }

  throw new Error('invalid ip')
}

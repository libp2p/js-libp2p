'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const { Address4, Address6 } = require('ip-address')

const errors = {
  ERR_INVALID_IP_PARAMETER: 'ERR_INVALID_IP_PARAMETER',
  ERR_INVALID_PORT_PARAMETER: 'ERR_INVALID_PORT_PARAMETER',
  ERR_INVALID_IP: 'ERR_INVALID_IP'
}

/**
 * Transform an IP, Port pair into a multiaddr
 *
 * @param {string} ip
 * @param {number|string} port
 */
function ipPortToMultiaddr (ip, port) {
  if (typeof ip !== 'string') {
    throw errCode(new Error(`invalid ip provided: ${ip}`), errors.ERR_INVALID_IP_PARAMETER)
  }

  port = parseInt(port)

  if (isNaN(port)) {
    throw errCode(new Error(`invalid port provided: ${port}`), errors.ERR_INVALID_PORT_PARAMETER)
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

  throw errCode(new Error(`invalid ip:port for creating a multiaddr: ${ip}:${port}`), errors.ERR_INVALID_IP)
}

module.exports = ipPortToMultiaddr

module.exports.Errors = errors

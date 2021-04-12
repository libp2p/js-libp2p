'use strict'

const { Multiaddr } = require('multiaddr')
const os = require('os')
const { resolve } = require('path')
const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

function multiaddrToNetConfig (addr) {
  const listenPath = addr.getPath()
  // unix socket listening
  if (listenPath) {
    return resolve(listenPath)
  }
  // tcp listening
  return addr.toOptions()
}

function getMultiaddrs (proto, ip, port) {
  const toMa = ip => new Multiaddr(`/${proto}/${ip}/tcp/${port}`)
  return (isAnyAddr(ip) ? getNetworkAddrs(ProtoFamily[proto]) : [ip]).map(toMa)
}

function isAnyAddr (ip) {
  return ['0.0.0.0', '::'].includes(ip)
}

/**
 * @private
 * @param {string} family - One of ['IPv6', 'IPv4']
 * @returns {string[]} an array of ip address strings
 */
const networks = os.networkInterfaces()
function getNetworkAddrs (family) {
  return Object.values(networks).reduce((addresses, netAddrs) => {
    netAddrs.forEach(netAddr => {
      // Add the ip of each matching network interface
      if (netAddr.family === family) addresses.push(netAddr.address)
    })
    return addresses
  }, [])
}

module.exports = {
  multiaddrToNetConfig,
  isAnyAddr,
  getMultiaddrs
}

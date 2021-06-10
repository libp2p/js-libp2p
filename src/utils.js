'use strict'

const { Multiaddr } = require('multiaddr')
const os = require('os')
const { resolve } = require('path')
const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

/**
 * @typedef {import('multiaddr').MultiaddrObject} MultiaddrObject
 */

/**
 * @param {Multiaddr} addr
 * @returns {MultiaddrObject}
 */
function multiaddrToNetConfig (addr) {
  const listenPath = addr.getPath()
  // unix socket listening
  if (listenPath) {
    // TCP should not return unix socket else need to refactor listener which accepts connection options object
    // @ts-ignore
    return resolve(listenPath)
  }
  // tcp listening
  return addr.toOptions()
}

/**
 * @param {'ip4' | 'ip6'} proto
 * @param {string} ip
 * @param {number} port
 * @returns {Multiaddr[]}
 */
function getMultiaddrs (proto, ip, port) {
  const toMa = /** @param {string} ip */ ip => new Multiaddr(`/${proto}/${ip}/tcp/${port}`)
  return (isAnyAddr(ip) ? getNetworkAddrs(ProtoFamily[proto]) : [ip]).map(toMa)
}

/**
 * @param {string} ip
 * @returns {boolean}
 */
function isAnyAddr (ip) {
  return ['0.0.0.0', '::'].includes(ip)
}

/**
 * @private
 * @param {string} family - One of ['IPv6', 'IPv4']
 * @returns {string[]} an array of ip address strings
 */
const networks = os.networkInterfaces()

/**
 * @param {string} family
 * @returns {string[]}
 */
function getNetworkAddrs (family) {
  const addresses = []

  for (const [, netAddrs] of Object.entries(networks)) {
    if (netAddrs) {
      for (const netAddr of netAddrs) {
        if (netAddr.family === family) {
          addresses.push(netAddr.address)
        }
      }
    }
  }

  return addresses
}

module.exports = {
  multiaddrToNetConfig,
  isAnyAddr,
  getMultiaddrs
}

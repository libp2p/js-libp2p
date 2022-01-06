import { Multiaddr } from '@multiformats/multiaddr'
import os from 'os'

const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

export function multiaddrToNetConfig (addr: Multiaddr) {
  const listenPath = addr.getPath()

  // unix socket listening
  if (listenPath != null) {
    // TCP should not return unix socket else need to refactor listener which accepts connection options object
    throw new Error('Unix Sockets are not supported by the TCP transport')
  }

  // tcp listening
  return addr.toOptions()
}

export function getMultiaddrs (proto: 'ip4' | 'ip6', ip: string, port: number) {
  const toMa = (ip: string) => new Multiaddr(`/${proto}/${ip}/tcp/${port}`)
  return (isAnyAddr(ip) ? getNetworkAddrs(ProtoFamily[proto]) : [ip]).map(toMa)
}

export function isAnyAddr (ip: string) {
  return ['0.0.0.0', '::'].includes(ip)
}

const networks = os.networkInterfaces()

function getNetworkAddrs (family: string) {
  const addresses = []

  for (const [, netAddrs] of Object.entries(networks)) {
    if (netAddrs != null) {
      for (const netAddr of netAddrs) {
        if (netAddr.family === family) {
          addresses.push(netAddr.address)
        }
      }
    }
  }

  return addresses
}

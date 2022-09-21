import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ListenOptions, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'
import os from 'os'
import path from 'path'

const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

export function multiaddrToNetConfig (addr: Multiaddr): ListenOptions | (IpcSocketConnectOpts & TcpSocketConnectOpts) {
  const listenPath = addr.getPath()

  // unix socket listening
  if (listenPath != null) {
    if (os.platform() === 'win32') {
      // Use named pipes on Windows systems.
      return { path: path.join('\\\\.\\pipe\\', listenPath) }
    } else {
      return { path: listenPath }
    }
  }

  // tcp listening
  return addr.toOptions()
}

export function getMultiaddrs (proto: 'ip4' | 'ip6', ip: string, port: number) {
  const toMa = (ip: string) => multiaddr(`/${proto}/${ip}/tcp/${port}`)
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

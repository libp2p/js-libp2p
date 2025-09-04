import { CODE_IP4, CODE_IP6, CODE_IP6ZONE, multiaddr } from '@multiformats/multiaddr'
import type { NetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

export function getIpFromMultiaddr (ma: Multiaddr): string | undefined {
  const components = ma.getComponents()
  let index = 0

  if (components[0]?.code === CODE_IP6ZONE) {
    index++
  }

  if (components[index]?.code !== CODE_IP4 && components[index]?.code !== CODE_IP6) {
    return
  }

  return components[index]?.value
}

export function netConfigToMultiaddr (config: NetConfig, port?: number | string, host?: string): Multiaddr {
  const parts: Array<string | number> = [
    config.type,
    host ?? config.host
  ]

  if (config.protocol != null) {
    const p = port ?? config.port

    if (p != null) {
      parts.push(
        config.protocol,
        p
      )
    }
  }

  if (config.type === 'ip6' && config.zone != null) {
    parts.unshift('ip6zone', config.zone)
  }

  if (config.cidr != null) {
    parts.push('ipcidr', config.cidr)
  }

  return multiaddr(`/${parts.join('/')}`)
}

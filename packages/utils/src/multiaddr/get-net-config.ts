import { InvalidParametersError } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface IP4NetConfig {
  type: 'ip4'
  host: string
  protocol?: 'tcp' | 'udp'
  port?: number
  cidr?: number
  sni?: string
}

export interface IP6NetConfig {
  type: 'ip6'
  host: string
  protocol?: 'tcp' | 'udp'
  port?: number
  zone?: string
  cidr?: string
  sni?: string
}

export interface DNSNetConfig {
  type: 'dns'
  host: string
  protocol?: 'tcp' | 'udp'
  port: number
  cidr?: number
}

export interface DNS4NetConfig {
  type: 'dns4'
  host: string
  protocol?: 'tcp' | 'udp'
  port: number
  cidr?: number
}

export interface DNS6NetConfig {
  type: 'dns6'
  host: string
  protocol?: 'tcp' | 'udp'
  port: number
  cidr?: number
}

export interface DNSAddrNetConfig {
  type: 'dnsaddr'
  host: string
  protocol?: 'tcp' | 'udp'
  port: number
  cidr?: number
}

export type NetConfig = IP4NetConfig | IP6NetConfig | DNSNetConfig | DNS4NetConfig | DNS6NetConfig | DNSAddrNetConfig

/**
 * Returns host/port/etc information for multiaddrs, if it is available.
 *
 * It will throw if the passed multiaddr does not start with a network address,
 * e.g. a IPv4, IPv6, DNS, DNS4, DNS6 or DNSADDR address
 */
export function getNetConfig (ma: Multiaddr): NetConfig {
  const components = ma.getComponents()
  const config: any = {}
  let index = 0

  if (components[index]?.name === 'ip6zone') {
    config.zone = `${components[index].value}`
    index++
  }

  if (components[index].name === 'ip4' || components[index].name === 'ip6') {
    config.type = components[index].name
    config.host = components[index].value
    index++
  } else if (components[index].name === 'dns' || components[index].name === 'dns4' || components[index].name === 'dns6') {
    config.type = components[index].name
    config.host = components[index].value
    index++
  } else if (components[index].name === 'dnsaddr') {
    config.type = components[index].name
    config.host = `_dnsaddr.${components[index].value}`
    index++
  }

  if (components[index]?.name === 'tcp' || components[index]?.name === 'udp') {
    config.protocol = components[index].name === 'tcp' ? 'tcp' : 'udp'
    config.port = parseInt(`${components[index].value}`)
    index++
  }

  if (components[index]?.name === 'ipcidr') {
    if (config.type === 'ip4') {
      config.cidr = parseInt(`${components[index].value}`)
    } else if (config.type === 'ip6') {
      config.cidr = `${components[index].value}`
    }
    index++
  }

  if (config.type == null || config.host == null) {
    throw new InvalidParametersError(`Multiaddr ${ma} was not an IPv4, IPv6, DNS, DNS4, DNS6 or DNSADDR address`)
  }

  if (components[index]?.name === 'tls' && components[index + 1]?.name === 'sni') {
    config.sni = components[index + 1].value
    index += 2
  }

  return config
}

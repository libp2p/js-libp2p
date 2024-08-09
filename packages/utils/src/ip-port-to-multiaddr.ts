import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'

/**
 * Transform an IP, Port pair into a multiaddr
 */
export function ipPortToMultiaddr (ip: string, port: number | string): Multiaddr {
  if (typeof ip !== 'string') {
    throw new InvalidParametersError(`invalid ip provided: ${ip}`) // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }

  if (typeof port === 'string') {
    port = parseInt(port)
  }

  if (isNaN(port)) {
    throw new InvalidParametersError(`invalid port provided: ${port}`)
  }

  if (isIPv4(ip)) {
    return multiaddr(`/ip4/${ip}/tcp/${port}`)
  }

  if (isIPv6(ip)) {
    return multiaddr(`/ip6/${ip}/tcp/${port}`)
  }

  throw new InvalidParametersError(`invalid ip:port for creating a multiaddr: ${ip}:${port}`)
}

import { logger } from '@libp2p/logger'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { CodeError } from '@libp2p/interfaces/errors'
import { Address4, Address6 } from '@achingbrain/ip-address'

const log = logger('libp2p:ip-port-to-multiaddr')

export const Errors = {
  ERR_INVALID_IP_PARAMETER: 'ERR_INVALID_IP_PARAMETER',
  ERR_INVALID_PORT_PARAMETER: 'ERR_INVALID_PORT_PARAMETER',
  ERR_INVALID_IP: 'ERR_INVALID_IP'
}

/**
 * Transform an IP, Port pair into a multiaddr
 */
export function ipPortToMultiaddr (ip: string, port: number | string): Multiaddr {
  if (typeof ip !== 'string') {
    throw new CodeError(`invalid ip provided: ${ip}`, Errors.ERR_INVALID_IP_PARAMETER) // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }

  if (typeof port === 'string') {
    port = parseInt(port)
  }

  if (isNaN(port)) {
    throw new CodeError(`invalid port provided: ${port}`, Errors.ERR_INVALID_PORT_PARAMETER)
  }

  try {
    // Test valid IPv4
    new Address4(ip) // eslint-disable-line no-new
    return multiaddr(`/ip4/${ip}/tcp/${port}`)
  } catch {}

  try {
    // Test valid IPv6
    const ip6 = new Address6(ip)
    return ip6.is4()
      ? multiaddr(`/ip4/${ip6.to4().correctForm()}/tcp/${port}`)
      : multiaddr(`/ip6/${ip}/tcp/${port}`)
  } catch (err) {
    const errMsg = `invalid ip:port for creating a multiaddr: ${ip}:${port}`
    log.error(errMsg)
    throw new CodeError(errMsg, Errors.ERR_INVALID_IP)
  }
}

import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'

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

  if (isIPv4(ip)) {
    return multiaddr(`/ip4/${ip}/tcp/${port}`)
  }

  if (isIPv6(ip)) {
    return multiaddr(`/ip6/${ip}/tcp/${port}`)
  }

  const errMsg = `invalid ip:port for creating a multiaddr: ${ip}:${port}`
  log.error(errMsg)
  throw new CodeError(errMsg, Errors.ERR_INVALID_IP)
}

import { isIPv6 } from '@chainsafe/is-ip'
import { cidrContains } from '@chainsafe/netmask'

export function isGlobalUnicastIp (ip: string): boolean {
  if (isIPv6(ip)) {
    return cidrContains('2000::/3', ip)
  }

  return false
}

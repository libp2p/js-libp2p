import { isIPv4, isIPv6 } from '@chainsafe/is-ip'

export function isLinkLocalIp (ip: string): boolean {
  if (isIPv4(ip)) {
    return ip.startsWith('169.254.')
  }

  if (isIPv6(ip)) {
    return ip.toLowerCase().startsWith('fe80')
  }

  return false
}

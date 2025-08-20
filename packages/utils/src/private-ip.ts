import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { Netmask } from 'netmask'

const PRIVATE_IP_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.0.0/29',
  '192.0.0.8/32',
  '192.0.0.9/32',
  '192.0.0.10/32',
  '192.0.0.170/32',
  '192.0.0.171/32',
  '192.0.2.0/24',
  '192.31.196.0/24',
  '192.52.193.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '192.175.48.0/24',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '240.0.0.0/4',
  '255.255.255.255/32'
]

const NETMASK_RANGES = PRIVATE_IP_RANGES.map(ipRange => new Netmask(ipRange))

function ipv4Check (ipAddr: string): boolean {
  for (const r of NETMASK_RANGES) {
    if (r.contains(ipAddr)) { return true }
  }

  return false
}

function isIpv4MappedIpv6 (ipAddr: string): boolean {
  return /^::ffff:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/.test(ipAddr)
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.5.2
 */
function ipv4MappedIpv6Check (ipAddr: string): boolean {
  const parts = ipAddr.split(':')

  if (parts.length < 2) {
    return false
  }

  const octet34 = parts[parts.length - 1].padStart(4, '0')
  const octet12 = parts[parts.length - 2].padStart(4, '0')

  const ip4 = `${parseInt(octet12.substring(0, 2), 16)}.${parseInt(octet12.substring(2), 16)}.${parseInt(octet34.substring(0, 2), 16)}.${parseInt(octet34.substring(2), 16)}`

  return ipv4Check(ip4)
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.2 example 3
 */
function isIpv4EmbeddedIpv6 (ipAddr: string): boolean {
  return /^::ffff:([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.test(ipAddr)
}

function ipv4EmbeddedIpv6Check (ipAddr: string): boolean {
  const parts = ipAddr.split(':')
  const ip4 = parts[parts.length - 1]

  return ipv4Check(ip4)
}

function ipv6Check (ipAddr: string): boolean {
  return /^::$/.test(ipAddr) ||
    /^::1$/.test(ipAddr) ||
    /^64:ff9b::([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.test(ipAddr) ||
    /^100::([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/.test(ipAddr) ||
    /^2001::([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/.test(ipAddr) ||
    /^2001:2[0-9a-fA-F]:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/.test(ipAddr) ||
    /^2001:db8:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/.test(ipAddr) ||
    /^2002:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/.test(ipAddr) ||
    /^f[c-d]([0-9a-fA-F]{2,2}):/i.test(ipAddr) ||
    /^fe[8-9a-bA-B][0-9a-fA-F]:/i.test(ipAddr) ||
    /^ff([0-9a-fA-F]{2,2}):/i.test(ipAddr)
}

export function isPrivateIp (ip: string): boolean | undefined {
  if (isIPv4(ip)) {
    return ipv4Check(ip)
  }

  if (isIpv4MappedIpv6(ip)) {
    return ipv4MappedIpv6Check(ip)
  }

  if (isIpv4EmbeddedIpv6(ip)) {
    return ipv4EmbeddedIpv6Check(ip)
  }

  if (isIPv6(ip)) {
    return ipv6Check(ip)
  }
}

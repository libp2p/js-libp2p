import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { parseIPv6 } from '@chainsafe/is-ip/parse'
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

/**
 * An IPv6 prefix, expressed as the first bytes of the address and the number of
 * significant bits
 */
interface Ipv6Prefix {
  bytes: number[]
  bits: number
}

/**
 * Private, reserved or otherwise non-globally-routable IPv6 ranges
 *
 * These are matched against the parsed address bytes so the result does not
 * depend on how the address is spelled (compression, leading zeros, case).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.2
 * @see https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
 */
const IPV6_PRIVATE_RANGES: Ipv6Prefix[] = [
  // ::/128 - unspecified address (RFC 4291)
  { bytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bits: 128 },
  // ::1/128 - loopback address (RFC 4291)
  { bytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], bits: 128 },
  // 64:ff9b::/96 - IPv4/IPv6 translation (RFC 6052)
  { bytes: [0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0], bits: 96 },
  // 100::/64 - discard-only address block (RFC 6666)
  { bytes: [0x01, 0x00, 0, 0, 0, 0, 0, 0], bits: 64 },
  // 2001::/32 - Teredo (RFC 4380)
  { bytes: [0x20, 0x01, 0, 0], bits: 32 },
  // 2001:20::/28 - ORCHIDv2 (RFC 7343)
  { bytes: [0x20, 0x01, 0x00, 0x20], bits: 28 },
  // 2001:db8::/32 - documentation (RFC 3849)
  { bytes: [0x20, 0x01, 0x0d, 0xb8], bits: 32 },
  // 2002::/16 - 6to4 (RFC 3056)
  { bytes: [0x20, 0x02], bits: 16 },
  // fc00::/7 - unique local addresses (RFC 4193)
  { bytes: [0xfc], bits: 7 },
  // fe80::/10 - link-local unicast (RFC 4291)
  { bytes: [0xfe, 0x80], bits: 10 },
  // ff00::/8 - multicast (RFC 4291)
  { bytes: [0xff], bits: 8 }
]

function matchesPrefix (addr: Uint8Array, prefix: Ipv6Prefix): boolean {
  for (let bit = 0; bit < prefix.bits; bit += 8) {
    const index = bit / 8
    const remaining = prefix.bits - bit
    const mask = remaining >= 8 ? 0xff : (0xff << (8 - remaining)) & 0xff

    if ((addr[index] & mask) !== (prefix.bytes[index] & mask)) {
      return false
    }
  }

  return true
}

/**
 * Returns true if the address is an IPv4-mapped IPv6 address (::ffff:0:0/96)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.5.2
 */
function isIpv4MappedIpv6 (addr: Uint8Array): boolean {
  for (let i = 0; i < 10; i++) {
    if (addr[i] !== 0) {
      return false
    }
  }

  return addr[10] === 0xff && addr[11] === 0xff
}

function ipv6Check (addr: Uint8Array): boolean {
  if (isIpv4MappedIpv6(addr)) {
    return ipv4Check(`${addr[12]}.${addr[13]}.${addr[14]}.${addr[15]}`)
  }

  return IPV6_PRIVATE_RANGES.some(range => matchesPrefix(addr, range))
}

export function isPrivateIp (ip: string): boolean | undefined {
  if (isIPv4(ip)) {
    return ipv4Check(ip)
  }

  if (isIPv6(ip)) {
    const addr = parseIPv6(ip)

    if (addr != null) {
      return ipv6Check(addr)
    }
  }
}

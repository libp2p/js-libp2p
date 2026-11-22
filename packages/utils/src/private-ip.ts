import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { parseIP } from '@chainsafe/is-ip/parse'
import { IpNet, iPv4FromIPv6, isIPv4mappedIPv6 } from '@chainsafe/netmask'

/**
 * Private, reserved or special-purpose IP ranges
 *
 * Addresses are matched by their parsed bytes so the result does not depend on
 * how an address is spelled (IPv6 compression, leading zeros, case).
 *
 * @see https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
 * @see https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
 */
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
  '255.255.255.255/32',
  '::/128', // unspecified (RFC 4291)
  '::1/128', // loopback (RFC 4291)
  '64:ff9b::/96', // IPv4/IPv6 translation (RFC 6052)
  '100::/64', // discard-only (RFC 6666)
  '2001::/32', // Teredo (RFC 4380)
  '2001:20::/28', // ORCHIDv2 (RFC 7343)
  '2001:db8::/32', // documentation (RFC 3849)
  '2002::/16', // 6to4 (RFC 3056)
  'fc00::/7', // unique local (RFC 4193)
  'fe80::/10', // link-local unicast (RFC 4291)
  'ff00::/8' // multicast (RFC 4291)
].map(cidr => new IpNet(cidr))

export function isPrivateIp (ip: string): boolean | undefined {
  if (!isIPv4(ip) && !isIPv6(ip)) {
    return
  }

  const parsed = parseIP(ip)

  if (parsed == null) {
    return
  }

  // check IPv4-mapped IPv6 (::ffff:0:0/96) against the IPv4 ranges, the length
  // check matters as isIPv4mappedIPv6 also matches 0.0.0.0
  const addr = parsed.length === 16 && isIPv4mappedIPv6(parsed) ? iPv4FromIPv6(parsed) : parsed

  return PRIVATE_IP_RANGES.some(net => net.contains(addr))
}

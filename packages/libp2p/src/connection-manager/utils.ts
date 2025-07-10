import { multiaddr } from '@multiformats/multiaddr'
import { convertToIpNet } from '@multiformats/multiaddr/convert'
import type { IpNet } from '@chainsafe/netmask'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Converts a multiaddr string or object to an IpNet object.
 * If the multiaddr doesn't include /ipcidr, it will encapsulate with the appropriate CIDR:
 * - /ipcidr/32 for IPv4
 * - /ipcidr/128 for IPv6
 *
 * @param {string | Multiaddr} ma - The multiaddr string or object to convert.
 * @returns {IpNet} The converted IpNet object.
 * @throws {Error} Throws an error if the multiaddr is not valid.
 */
export function multiaddrToIpNet (ma: string | Multiaddr): IpNet {
  try {
    let parsedMa: Multiaddr
    if (typeof ma === 'string') {
      parsedMa = multiaddr(ma)
    } else {
      parsedMa = ma
    }

    const protoNames = new Set([...parsedMa.getComponents().map(component => component.name)])

    // Check if /ipcidr is already present
    if (!protoNames.has('ipcidr')) {
      const isIPv6 = protoNames.has('ip6')
      const cidr = isIPv6 ? '/ipcidr/128' : '/ipcidr/32'
      parsedMa = parsedMa.encapsulate(cidr)
    }

    return convertToIpNet(parsedMa)
  } catch (error) {
    throw new Error(`Can't convert to IpNet, Invalid multiaddr format: ${ma}`)
  }
}

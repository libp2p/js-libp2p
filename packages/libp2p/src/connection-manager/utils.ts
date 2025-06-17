import { multiaddr, resolvers } from '@multiformats/multiaddr'
import { convertToIpNet } from '@multiformats/multiaddr/convert'
import type { IpNet } from '@chainsafe/netmask'
import type { LoggerOptions } from '@libp2p/interface'
import type { Multiaddr, ResolveOptions } from '@multiformats/multiaddr'

/**
 * Recursively resolve DNSADDR multiaddrs
 */
export async function resolveMultiaddrs (ma: Multiaddr, options: ResolveOptions & LoggerOptions): Promise<Multiaddr[]> {
  // check multiaddr resolvers
  let resolvable = false

  for (const key of resolvers.keys()) {
    resolvable = ma.protoNames().includes(key)

    if (resolvable) {
      break
    }
  }

  // return multiaddr if it is not resolvable
  if (!resolvable) {
    return [ma]
  }

  const output = await ma.resolve(options)

  options.log('resolved %s to', ma, output.map(ma => ma.toString()))

  return output
}

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

    // Check if /ipcidr is already present
    if (!parsedMa.protoNames().includes('ipcidr')) {
      const isIPv6 = parsedMa.protoNames().includes('ip6')
      const cidr = isIPv6 ? '/ipcidr/128' : '/ipcidr/32'
      parsedMa = parsedMa.encapsulate(cidr)
    }

    return convertToIpNet(parsedMa)
  } catch (error) {
    throw new Error(`Can't convert to IpNet, Invalid multiaddr format: ${ma}`)
  }
}

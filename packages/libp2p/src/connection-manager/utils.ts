import { resolvers } from '@multiformats/multiaddr'
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

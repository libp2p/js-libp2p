import { RecursionLimitError } from '../../errors.ts'
import { MAX_RECURSIVE_DEPTH } from '../constants.defaults.ts'
import type { MultiaddrResolveOptions, MultiaddrResolver } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface ResolveOptions extends MultiaddrResolveOptions {
  /**
   * When resolving DNSADDR Multiaddrs that resolve to other DNSADDR Multiaddrs,
   * limit how many times we will recursively resolve them.
   *
   * @default 32
   */
  maxRecursiveDepth?: number

  /**
   * The current recursive depth
   *
   * @default 0
   */
  depth?: number
}

/**
 * Recursively resolve multiaddrs
 */
export async function resolveMultiaddr (address: Multiaddr, resolvers: Record<string, MultiaddrResolver>, options: ResolveOptions): Promise<Multiaddr[]> {
  const depth = options.depth ?? 0

  if (depth > (options.maxRecursiveDepth ?? MAX_RECURSIVE_DEPTH)) {
    throw new RecursionLimitError('Max recursive depth reached')
  }

  let resolved = false
  const output: Multiaddr[] = []

  for (const resolver of Object.values(resolvers)) {
    if (resolver.canResolve(address)) {
      resolved = true
      const addresses = await resolver.resolve(address, options)

      for (const address of addresses) {
        output.push(
          ...(await resolveMultiaddr(address, resolvers, {
            ...options,
            depth: depth + 1
          }))
        )
      }
    }
  }

  if (resolved === false) {
    output.push(address)
  }

  return output
}

export { dnsaddrResolver } from './dnsaddr.js'

import type { LoggerOptions } from '@libp2p/interface'
import type { DNS } from '@multiformats/dns'
import type { AbortOptions, Multiaddr } from '@multiformats/multiaddr'

export interface ResolveOptions extends AbortOptions, LoggerOptions {
  dns?: DNS
  maxRecursiveDepth?: number
}

/**
 * Resolve multiaddr recursively
 */
export async function resolveMultiaddrs (ma: Multiaddr, options: ResolveOptions): Promise<Multiaddr[]> {
  const output = await ma.resolve(options)

  options.log('resolved %s to', ma, output.map(ma => ma.toString()))

  return output
}

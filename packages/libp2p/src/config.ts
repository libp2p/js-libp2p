import { FaultTolerance, InvalidParametersError } from '@libp2p/interface'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import mergeOptions from 'merge-options'
import type { Libp2pInit } from './index.js'
import type { ServiceMap } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const DefaultConfig: Libp2pInit = {
  addresses: {
    listen: [],
    announce: [],
    noAnnounce: [],
    announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs
  },
  connectionManager: {
    resolvers: {
      dnsaddr: dnsaddrResolver
    }
  },
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  }
}

export async function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: Libp2pInit<T>): Promise<Libp2pInit<T>> {
  const resultingOptions: Libp2pInit<T> = mergeOptions(DefaultConfig, opts)

  if (resultingOptions.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) { // eslint-disable-line no-undef
    throw new InvalidParametersError('Private network is enforced, but no protector was provided')
  }

  return resultingOptions
}

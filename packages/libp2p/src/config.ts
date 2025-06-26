import { FaultTolerance, InvalidParametersError } from '@libp2p/interface'
import { mergeOptions } from '@libp2p/utils/merge-options'
import { dnsaddrResolver } from './connection-manager/resolvers/dnsaddr.ts'
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

  if (resultingOptions.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) {
    throw new InvalidParametersError('Private network is enforced, but no protector was provided')
  }

  return resultingOptions
}

import { FaultTolerance } from '@libp2p/interface-transport'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import mergeOptions from 'merge-options'
import { object, optional } from 'superstruct'
import { validateConnectionManagerConfig } from './connection-manager/utils.js'
import type { Libp2pInit } from './index.js'
import type { ServiceMap } from '@libp2p/interface-libp2p'
import type { RecursivePartial } from '@libp2p/interfaces'
import type { Multiaddr } from '@multiformats/multiaddr'

const DefaultConfig: Partial<Libp2pInit> = {
  addresses: {
    listen: [],
    announce: [],
    noAnnounce: [],
    announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs
  },
  connectionManager: {
    resolvers: {
      dnsaddr: dnsaddrResolver
    },
    addressSorter: publicAddressesFirst
  },
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  }
}

export function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: RecursivePartial<Libp2pInit<T>>): Libp2pInit<T> {
  const libp2pConfig = object({
    connectionManager: optional(validateConnectionManagerConfig(opts.connectionManager))
  })

  const [error] = libp2pConfig.validate(opts)

  if (error != null) throw error

  const resultingOptions: Libp2pInit<T> = mergeOptions(DefaultConfig, opts)

  return resultingOptions
}

import { FaultTolerance } from '@libp2p/interface/transport'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import mergeOptions from 'merge-options'
import type { ServiceMap, RecursivePartial } from '@libp2p/interface'
import type { Libp2pInit } from '../index.js'
import type { AddressManagerInit } from '../address-manager'
import { validateAddressManagerConfig } from '../address-manager/utils.js'
import { object } from 'yup'
import { validateConnectionManagerConfig } from '../connection-manager/utils.js'
import type { ConnectionManagerInit } from '../connection-manager/index.js'

const DefaultConfig: Partial<Libp2pInit> = {
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
    addresses: validateAddressManagerConfig(opts?.addresses as AddressManagerInit),
    connectionManager: validateConnectionManagerConfig(opts?.connectionManager as ConnectionManagerInit),
  })

  if (opts?.services) {
    // @ts-expect-error
   if ((opts.services?.kadDHT || opts.services?.relay || opts.services?.ping) && !opts.services.identify) {
      throw new Error('identify service is required when using kadDHT, relay, or ping')
    }
  }

  const parsedOpts = libp2pConfig.validateSync(opts)

  const resultingOptions: Libp2pInit<T> = mergeOptions(DefaultConfig, parsedOpts)

  return resultingOptions
}

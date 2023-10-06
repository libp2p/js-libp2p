import { FaultTolerance } from '@libp2p/interface/transport'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import mergeOptions from 'merge-options'
import { object } from 'yup'
import { validateAddressManagerConfig } from '../address-manager/utils.js'
import { validateConnectionManagerConfig } from '../connection-manager/utils.js'
import type { AddressManagerInit } from '../address-manager'
import type { ConnectionManagerInit } from '../connection-manager/index.js'
import type { Libp2pInit } from '../index.js'
import type { ServiceMap, RecursivePartial } from '@libp2p/interface'

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
    connectionManager: validateConnectionManagerConfig(opts?.connectionManager as ConnectionManagerInit)
  })

  if ((opts?.services) != null) {
    // @ts-expect-error until we resolve https://github.com/libp2p/js-libp2p/pull/1762 and have a better way of discovering type dependencies
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if ((opts.services?.kadDHT || opts.services?.relay || opts.services?.ping) && !opts.services.identify) {
      throw new Error('identify service is required when using kadDHT, relay, or ping')
    }
  }

  const parsedOpts = libp2pConfig.validateSync(opts)

  const resultingOptions: Libp2pInit<T> = mergeOptions(DefaultConfig, parsedOpts)

  return resultingOptions
}

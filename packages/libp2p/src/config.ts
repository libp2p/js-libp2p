import { FaultTolerance, InvalidParametersError } from '@libp2p/interface'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { defaultAddressSort } from '@libp2p/utils/address-sort'
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
    },
    addressSorter: defaultAddressSort
  },
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  }
}

export async function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: Libp2pInit<T>): Promise<Libp2pInit<T> & Required<Pick<Libp2pInit<T>, 'peerId'>>> {
  const resultingOptions: Libp2pInit<T> & Required<Pick<Libp2pInit<T>, 'peerId'>> = mergeOptions(DefaultConfig, opts)

  if (resultingOptions.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) { // eslint-disable-line no-undef
    throw new InvalidParametersError('Private network is enforced, but no protector was provided')
  }

  if (resultingOptions.privateKey != null && !(await peerIdFromKeys(resultingOptions.privateKey.public.bytes, resultingOptions.privateKey.bytes)).equals(resultingOptions.peerId)) {
    throw new InvalidParametersError('Private key doesn\'t match peer id')
  }

  return resultingOptions
}

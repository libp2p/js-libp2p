import { CodeError, FaultTolerance } from '@libp2p/interface'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { defaultAddressSort } from '@libp2p/utils/address-sort'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import mergeOptions from 'merge-options'
import { codes, messages } from './errors.js'
import type { Libp2pInit } from './index.js'
import type { ServiceMap, RecursivePartial } from '@libp2p/interface'
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
    addressSorter: defaultAddressSort
  },
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  }
}

export async function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: RecursivePartial<Libp2pInit<T>>): Promise<Libp2pInit<T>> {
  const resultingOptions: Libp2pInit<T> = mergeOptions(DefaultConfig, opts)

  if (resultingOptions.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) { // eslint-disable-line no-undef
    throw new CodeError(messages.ERR_PROTECTOR_REQUIRED, codes.ERR_PROTECTOR_REQUIRED)
  }

  if (!(await peerIdFromKeys(resultingOptions.privateKey.public.bytes, resultingOptions.privateKey.bytes)).equals(resultingOptions.peerId)) {
    throw new CodeError('Private key doesn\'t match peer id', codes.ERR_INVALID_KEY)
  }

  return resultingOptions
}

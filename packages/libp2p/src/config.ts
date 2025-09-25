import { InvalidParametersError } from '@libp2p/interface'
import type { Libp2pInit } from './index.js'
import type { ServiceMap } from '@libp2p/interface'

export async function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: Libp2pInit<T>): Promise<Libp2pInit<T>> {
  if (opts.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) {
    throw new InvalidParametersError('Private network is enforced, but no protector was provided')
  }

  return opts
}

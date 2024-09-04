import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from '../../../src/index.js'
import { createBaseOptions } from '../base-options.browser.js'
import type { AddressManagerInit } from '../../../src/address-manager/index.js'
import type { Libp2pOptions } from '../../../src/index.js'
import type { Libp2p, ServiceMap } from '@libp2p/interface'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

export interface CreatePeerOptions <T extends ServiceMap> {
  /**
   * number of peers (default: 1)
   */
  number?: number

  /**
   * nodes should start (default: true)
   */
  started?: boolean

  config?: Libp2pOptions<T>
}

/**
 * Create libp2p nodes.
 */
export async function createNode <T extends ServiceMap> (options: CreatePeerOptions<T> = {}): Promise<Libp2p<T>> {
  const started = options.started ?? true
  const config = options.config ?? {}
  const addresses: AddressManagerInit = started
    ? {
        listen: [listenAddr.toString()],
        announce: [],
        noAnnounce: [],
        announceFilter: (addrs) => addrs
      }
    : {
        listen: [],
        announce: [],
        noAnnounce: [],
        announceFilter: (addrs) => addrs
      }
  const peer = await createLibp2p(createBaseOptions({
    addresses,
    start: started,
    ...config
  }))

  if (started) {
    await peer.start()
  }

  return peer
}

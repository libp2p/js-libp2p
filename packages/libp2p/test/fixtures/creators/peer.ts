import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2pNode, type Libp2pNode } from '../../../src/libp2p.js'
import { createBaseOptions } from '../base-options.browser.js'
import type { AddressManagerInit } from '../../../src/address-manager/index.js'
import type { Libp2pOptions } from '../../../src/index.js'
import type { ServiceMap } from '@libp2p/interface'

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
export async function createNode <T extends ServiceMap> (options: CreatePeerOptions<T> = {}): Promise<Libp2pNode<T>> {
  const started = options.started ?? true
  const config = options.config ?? {}
  const peerId = await createEd25519PeerId()
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
  const peer = await createLibp2pNode(createBaseOptions({
    peerId,
    addresses,
    start: started,
    ...config
  }))

  if (started) {
    await peer.start()
  }

  return peer
}

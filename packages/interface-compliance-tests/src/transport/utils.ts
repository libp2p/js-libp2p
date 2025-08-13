/* eslint-env mocha */

import { echo } from '@libp2p/echo'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import { mockMuxer } from '@libp2p/utils'
import { createLibp2p } from 'libp2p'
import type { Echo } from '@libp2p/echo'
import type { Libp2p, Upgrader } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Libp2pOptions } from 'libp2p'

export async function createPeer (config: Partial<Libp2pOptions> = {}): Promise<Libp2p<{ echo: Echo }>> {
  return createLibp2p({
    transports: [
      memory()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    streamMuxers: [
      () => mockMuxer()
    ],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    ...config,
    services: {
      ...config.services,
      echo: echo({
        maxInboundStreams: 5_000
      })
    }
  })
}

export function getUpgrader (libp2p: any): Upgrader {
  return libp2p.components.upgrader
}

export function getTransportManager (libp2p: any): TransportManager {
  return libp2p.components.transportManager
}

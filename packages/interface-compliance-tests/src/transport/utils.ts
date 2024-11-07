/* eslint-env mocha */

import { echo } from '@libp2p/echo'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import delay from 'delay'
import map from 'it-map'
import { createLibp2p } from 'libp2p'
import { mockMuxer } from '../mocks/muxer.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p, Upgrader } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Libp2pOptions } from 'libp2p'

export async function createPeer (config: Partial<Libp2pOptions<{ echo: Echo }>> = {}): Promise<Libp2p<{ echo: Echo }>> {
  const node = await createLibp2p({
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
      echo: echo(),
      ...config.services
    }
  })

  return node
}

/**
 * Monkey patch the upgrader in the passed libp2p to add latency to any
 * multiaddr connections upgraded to connections - this is to work with
 * transports that have their own muxers/encrypters and do not support
 * connection protection
 */
export function slowNetwork (libp2p: any, latency: number): void {
  const upgrader: Upgrader = getUpgrader(libp2p)

  const originalUpgradeInbound = upgrader.upgradeInbound.bind(upgrader)
  const originalUpgradeOutbound = upgrader.upgradeOutbound.bind(upgrader)

  upgrader.upgradeInbound = async (maConn, opts) => {
    maConn.source = map(maConn.source, async (buf) => {
      await delay(latency)
      return buf
    })

    return originalUpgradeInbound(maConn, opts)
  }

  upgrader.upgradeOutbound = async (maConn, opts) => {
    maConn.source = map(maConn.source, async (buf) => {
      await delay(latency)
      return buf
    })

    return originalUpgradeOutbound(maConn, opts)
  }
}

export function getUpgrader (libp2p: any): Upgrader {
  return libp2p.components.upgrader
}

export function getTransportManager (libp2p: any): TransportManager {
  return libp2p.components.transportManager
}

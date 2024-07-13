import { enable, disable } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { getPeers } from '../utils/get-peers.js'
import { getSelf } from '../utils/get-self.js'
import type { MetricsRPC } from './index.js'
import type { DevToolsMetricsComponents } from '../index.js'
import type { PeerId } from '@libp2p/interface'
import type { OpenConnectionOptions } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { AbortOptions } from 'it-pushable'

export function metricsRpc (components: DevToolsMetricsComponents): MetricsRPC {
  const log = components.logger.forComponent('libp2p:devtools-metrics:metrics-rpc')

  return {
    init: async () => {
      return {
        self: await getSelf(components),
        peers: await getPeers(components, log),
        debug: localStorage.getItem('debug') ?? ''
      }
    },
    setDebug: async (namespace?: string) => {
      if (namespace?.length != null && namespace?.length > 0) {
        enable(namespace)
        localStorage.setItem('debug', namespace)
      } else {
        disable()
        localStorage.removeItem('debug')
      }
    },
    openConnection: async (peerIdOrMultiaddr: string, options?: OpenConnectionOptions) => {
      let peer: PeerId | Multiaddr

      try {
        peer = peerIdFromString(peerIdOrMultiaddr)
      } catch {
        peer = multiaddr(peerIdOrMultiaddr)
      }

      await components.connectionManager.openConnection(peer, options)
    },
    closeConnection: async (peerId: PeerId, options?: AbortOptions) => {
      await Promise.all(
        components.connectionManager.getConnections(peerId)
          .map(async connection => {
            try {
              await connection.close(options)
            } catch (err: any) {
              connection.abort(err)
            }
          })
      )
    },
    contentRouting: components.contentRouting,
    peerRouting: components.peerRouting
  }
}

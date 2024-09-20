import { enable, disable } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { gatherCapabilities } from '../utils/gather-capabilities.js'
import { getPeers } from '../utils/get-peers.js'
import { getPubSub } from '../utils/get-pubsub.js'
import { getSelf } from '../utils/get-self.js'
import type { MetricsRPC } from './index.js'
import type { DevToolsMetricsComponents } from '../index.js'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export function metricsRpc (components: DevToolsMetricsComponents): MetricsRPC {
  const log = components.logger.forComponent('libp2p:devtools-metrics:metrics-rpc')

  return {
    init: async () => {
      return {
        self: await getSelf(components),
        peers: await getPeers(components, log),
        debug: localStorage.getItem('debug') ?? '',
        capabilities: gatherCapabilities(components)
      }
    },
    setDebug: async (namespace?) => {
      if (namespace?.length != null && namespace?.length > 0) {
        enable(namespace)
        localStorage.setItem('debug', namespace)
      } else {
        disable()
        localStorage.removeItem('debug')
      }
    },
    openConnection: async (peerIdOrMultiaddr, options?) => {
      let peer: PeerId | Multiaddr

      try {
        peer = peerIdFromString(peerIdOrMultiaddr)
      } catch {
        peer = multiaddr(peerIdOrMultiaddr)
      }

      await components.connectionManager.openConnection(peer, options)
    },
    closeConnection: async (peerId, options?) => {
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
    peerRouting: components.peerRouting,
    pubsub: {
      async getTopics (component) {
        return getPubSub(component, components).getTopics()
      },
      async subscribe (component, topic) {
        getPubSub(component, components).subscribe(topic)
      },
      async unsubscribe (component, topic) {
        getPubSub(component, components).unsubscribe(topic)
      },
      async publish (component, topic, message) {
        await getPubSub(component, components).publish(topic, message)
      },
      async getSubscribers (component: string, topic: string) {
        return getPubSub(component, components).getSubscribers(topic)
      }
    }
  }
}

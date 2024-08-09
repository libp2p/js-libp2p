import { base64 } from 'multiformats/bases/base64'
import { toObject } from './to-object.js'
import type { Peer } from '../rpc/index.js'
import type { Logger, PeerStore } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

export interface Components {
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

export async function getPeers (components: Components, log: Logger): Promise<Peer[]> {
  const peers: Peer[] = []
  const connections = components.connectionManager.getConnectionsMap()
  const connectedAddresses = [...connections.values()].flatMap(conn => conn).map(conn => conn.remoteAddr.toString())

  for (const [peerId, conns] of connections.entries()) {
    try {
      const peer = await components.peerStore.get(peerId)

      peers.push({
        id: peerId,
        addresses: peer.addresses.map(({ isCertified, multiaddr }) => {
          return {
            multiaddr,
            isCertified,
            isConnected: connectedAddresses.includes(multiaddr.toString())
          }
        }),
        protocols: [...peer.protocols],
        tags: toObject(peer.tags, (t) => t.value),
        metadata: toObject(peer.metadata, (buf) => base64.encode(buf))
      })
    } catch (err) {
      log.error('could not load peer data from peer store', err)

      peers.push({
        id: peerId,
        addresses: conns.map(conn => {
          return {
            multiaddr: conn.remoteAddr,
            isConnected: connectedAddresses.includes(conn.remoteAddr.toString())
          }
        }),
        protocols: [],
        tags: {},
        metadata: {}
      })
    }
  }

  return peers
}

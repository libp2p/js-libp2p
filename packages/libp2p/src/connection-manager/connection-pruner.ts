import { PeerMap } from '@libp2p/peer-collections'
import { safelyCloseConnectionIfUnused } from '@libp2p/utils/close'
import { MAX_INBOUND_CONNECTIONS, MAX_OUTBOUND_CONNECTIONS } from './constants.js'
import type { Libp2pEvents, Logger, ComponentLogger, TypedEventTarget, PeerStore, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

interface ConnectionPrunerInit {
  maxInboundConnections?: number
  maxOutboundConnections?: number
  allow?: Multiaddr[]
}

interface ConnectionPrunerComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

const defaultOptions = {
  maxInboundConnections: MAX_INBOUND_CONNECTIONS,
  maxOutboundConnections: MAX_OUTBOUND_CONNECTIONS,
  allow: []
}

/**
 * If we go over the max connections limit, choose some connections to close
 */
export class ConnectionPruner {
  private readonly maxInboundConnections: number
  private readonly maxOutboundConnections: number
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly allow: Multiaddr[]
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly log: Logger

  constructor (components: ConnectionPrunerComponents, init: ConnectionPrunerInit = {}) {
    this.maxInboundConnections = init.maxInboundConnections ?? defaultOptions.maxInboundConnections
    this.maxOutboundConnections = init.maxOutboundConnections ?? defaultOptions.maxOutboundConnections
    this.allow = init.allow ?? defaultOptions.allow
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
    this.events = components.events
    this.log = components.logger.forComponent('libp2p:connection-manager:connection-pruner')

    // check the max connection limit whenever a peer connects
    components.events.addEventListener('connection:open', () => {
      this.maybePruneConnections()
        .catch(err => {
          this.log.error(err)
        })
    })
  }

  /**
   * If we have more connections than our maximum, select some excess connections
   * to prune based on peer value
   */
  async maybePruneConnections (): Promise<void> {
    const connections = this.connectionManager.getConnections()
    const inboundConnections = connections.filter(c => c.direction === 'inbound')
    const outboundConnections = connections.filter(c => c.direction === 'outbound')

    this.log('checking max inbound connections limit %d/%d', inboundConnections.length, this.maxInboundConnections)
    this.log('checking max outbound connections limit %d/%d', outboundConnections.length, this.maxOutboundConnections)

    if (inboundConnections.length <= this.maxInboundConnections && outboundConnections.length <= this.maxOutboundConnections) {
      return
    }

    const inboundPeerMap = await this.getPeerMap(inboundConnections)
    const outboundPeerMap = await this.getPeerMap(outboundConnections)

    const sortedInboundConnections = this.sortConnections(inboundConnections, inboundPeerMap)
    const sortedOutboundConnections = this.sortConnections(outboundConnections, outboundPeerMap)

    const inboundToClose = this.connectionsToClose(sortedInboundConnections, Math.max(inboundConnections.length - this.maxInboundConnections, 0))
    const outboundToClose = this.connectionsToClose(sortedOutboundConnections, Math.max(outboundConnections.length - this.maxOutboundConnections, 0))

    // close connections
    await Promise.all(
      [...inboundToClose, ...outboundToClose].map(async connection => {
        await safelyCloseConnectionIfUnused(connection, {
          signal: AbortSignal.timeout(1000)
        })
      })
    )

    // despatch prune event
    this.events.safeDispatchEvent('connection:prune', { detail: [...inboundToClose, ...outboundToClose] })
    this.events.safeDispatchEvent('connection:prune', { detail: outboundToClose })
  }

  async getPeerMap (connections: Connection[]): Promise<PeerMap<number>> {
    const peerValues = new PeerMap<number>()
    // work out peer values
    for (const connection of connections) {
      const remotePeer = connection.remotePeer

      if (peerValues.has(remotePeer)) {
        continue
      }

      peerValues.set(remotePeer, 0)

      try {
        const peer = await this.peerStore.get(remotePeer)

        // sum all tag values for the peer to determine its importance
        peerValues.set(remotePeer, [...peer.tags.values()].reduce((acc, curr) => {
          return acc + curr.value
        }, 0))
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          this.log.error('error loading peer tags', err)
        }
      }
    }

    return peerValues
  }

  connectionsToClose (connections: Connection[], pruneCount: number): Connection[] {
    const toClose: Connection[] = []
    for (const connection of connections) {
      this.log('too many inbound connections open - closing a connection to %p', connection.remotePeer)
      // check allow list
      const connectionInAllowList = this.allow.some((ma) => {
        return connection.remoteAddr.toString().startsWith(ma.toString())
      })

      // Connections in the allow list should be excluded from pruning
      if (!connectionInAllowList) {
        toClose.push(connection)
      }

      if (toClose.length === pruneCount) {
        break
      }
    }

    return toClose
  }

  sortConnections (connections: Connection[], peerMap: PeerMap<number>): Connection[] {
    return connections
      // sort by connection age, newest to oldest
      .sort((a, b) => {
        const connectionALifespan = a.timeline.open
        const connectionBLifespan = b.timeline.open

        if (connectionALifespan < connectionBLifespan) {
          return 1
        }

        if (connectionALifespan > connectionBLifespan) {
          return -1
        }

        return 0
      })
      // sort by number of streams, lowest to highest
      .sort((a, b) => {
        if (a.streams.length > b.streams.length) {
          return 1
        }

        if (a.streams.length < b.streams.length) {
          return -1
        }

        return 0
      })
      // sort by tag value, lowest to highest
      .sort((a, b) => {
        const peerAValue = peerMap.get(a.remotePeer) ?? 0
        const peerBValue = peerMap.get(b.remotePeer) ?? 0

        if (peerAValue > peerBValue) {
          return 1
        }

        if (peerAValue < peerBValue) {
          return -1
        }

        return 0
      })
  }
}

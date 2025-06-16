import { PeerMap } from '@libp2p/peer-collections'
import { safelyCloseConnectionIfUnused } from '@libp2p/utils/close'
import { multiaddrToIpNet } from './utils.js'
import type { IpNet } from '@chainsafe/netmask'
import type { Libp2pEvents, Logger, ComponentLogger, PeerStore, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'

interface ConnectionPrunerInit {
  allow?: Multiaddr[]
}

interface ConnectionPrunerComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * If we go over the max connections limit, choose some connections to close
 */
export class ConnectionPruner {
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly allow: IpNet[]
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly log: Logger

  constructor (components: ConnectionPrunerComponents, init: ConnectionPrunerInit = {}) {
    this.allow = (init.allow ?? []).map(ma => multiaddrToIpNet(ma))
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
    this.events = components.events
    this.log = components.logger.forComponent('libp2p:connection-manager:connection-pruner')
    this.maybePruneConnections = this.maybePruneConnections.bind(this)
  }

  start (): void {
    this.events.addEventListener('connection:open', this.maybePruneConnections)
  }

  stop (): void {
    this.events.removeEventListener('connection:open', this.maybePruneConnections)
  }

  maybePruneConnections (): void {
    this._maybePruneConnections()
      .catch(err => {
        this.log.error('error while pruning connections %e', err)
      })
  }

  /**
   * If we have more connections than our maximum, select some excess connections
   * to prune based on peer value
   */
  private async _maybePruneConnections (): Promise<void> {
    const connections = this.connectionManager.getConnections()
    const numConnections = connections.length
    const maxConnections = this.connectionManager.getMaxConnections()

    this.log('checking max connections limit %d/%d', numConnections, maxConnections)

    if (numConnections <= maxConnections) {
      return
    }

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

        // sum all tag values
        peerValues.set(remotePeer, [...peer.tags.values()].reduce((acc, curr) => {
          return acc + curr.value
        }, 0))
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          this.log.error('error loading peer tags', err)
        }
      }
    }

    const sortedConnections = this.sortConnections(connections, peerValues)

    // close some connections
    const toPrune = Math.max(numConnections - maxConnections, 0)
    const toClose = []

    for (const connection of sortedConnections) {
      this.log('too many connections open - closing a connection to %p', connection.remotePeer)
      // check allow list
      const connectionInAllowList = this.allow.some((ipNet) => {
        return ipNet.contains(connection.remoteAddr.nodeAddress().address)
      })

      // Connections in the allow list should be excluded from pruning
      if (!connectionInAllowList) {
        toClose.push(connection)
      }

      if (toClose.length === toPrune) {
        break
      }
    }

    // close connections
    await Promise.all(
      toClose.map(async connection => {
        await safelyCloseConnectionIfUnused(connection, {
          signal: AbortSignal.timeout(1000)
        })
      })
    )

    // despatch prune event
    this.events.safeDispatchEvent('connection:prune', { detail: toClose })
  }

  sortConnections (connections: Connection[], peerValues: PeerMap<number>): Connection[] {
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
      // sort by direction, incoming first then outgoing
      .sort((a, b) => {
        if (a.direction === 'outbound' && b.direction === 'inbound') {
          return 1
        }

        if (a.direction === 'inbound' && b.direction === 'outbound') {
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
        const peerAValue = peerValues.get(a.remotePeer) ?? 0
        const peerBValue = peerValues.get(b.remotePeer) ?? 0

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

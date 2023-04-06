import { logger } from '@libp2p/logger'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { PeerMap } from '@libp2p/peer-collections'
import type { MultiaddrFilter } from '@multiformats/multiaddr'
import { MAX_CONNECTIONS } from './constants.js'
import { CustomEvent } from '@libp2p/interfaces/events'

const log = logger('libp2p:connection-manager:connection-pruner')

export interface ConnectionPrunerInit {
  /**
   * The maximum number of connections libp2p is willing to have before it starts disconnecting. Defaults to `Infinity`
   */
  maxConnections?: number

  /**
   * A list of multiaddrs that will always be allowed (except if they are in the
   * deny list) to open connections to this node even if we've reached maxConnections
   */
  allow?: MultiaddrFilter[]
}

export interface ConnectionPrunerComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

const defaultOptions = {
  maxConnections: MAX_CONNECTIONS,
  allow: []
}

/**
 * If we go over the max connections limit, choose some connections to close
 */
export class ConnectionPruner {
  private readonly maxConnections: number
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly allow: MultiaddrFilter[]

  constructor (components: ConnectionPrunerComponents, init: ConnectionPrunerInit = {}) {
    this.maxConnections = init.maxConnections ?? defaultOptions.maxConnections
    this.allow = init.allow ?? defaultOptions.allow
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
  }

  /**
   * If we have more connections than our maximum, select some excess connections
   * to prune based on peer value
   */
  async maybePruneConnections (): Promise<void> {
    const connections = this.connectionManager.getConnections()
    const numConnections = connections.length
    const toPrune = Math.max(numConnections - this.maxConnections, 0)

    log.trace('checking max connections limit %d/%d', numConnections, this.maxConnections)
    if (numConnections <= this.maxConnections) {
      return
    }

    log('max connections limit exceeded %d/%d, pruning %d connection(s)', numConnections, this.maxConnections, toPrune)
    const peerValues = new PeerMap<number>()

    // work out peer values
    for (const connection of connections) {
      const remotePeer = connection.remotePeer

      if (peerValues.has(remotePeer)) {
        continue
      }

      const tags = await this.peerStore.getTags(remotePeer)

      // sum all tag values
      peerValues.set(remotePeer, tags.reduce((acc, curr) => {
        return acc + curr.value
      }, 0))
    }

    // sort by value, lowest to highest
    const sortedConnections = connections.sort((a, b) => {
      const peerAValue = peerValues.get(a.remotePeer) ?? 0
      const peerBValue = peerValues.get(b.remotePeer) ?? 0

      if (peerAValue > peerBValue) {
        return 1
      }

      if (peerAValue < peerBValue) {
        return -1
      }

      // if the peers have an equal tag value then we want to close short-lived connections first
      const connectionALifespan = a.stat.timeline.open
      const connectionBLifespan = b.stat.timeline.open

      if (connectionALifespan < connectionBLifespan) {
        return 1
      }

      if (connectionALifespan > connectionBLifespan) {
        return -1
      }

      return 0
    })

    // close some connections
    const toClose = []

    for (const connection of sortedConnections) {
      log('too many connections open - closing a connection to %p', connection.remotePeer)
      // check allow list
      const connectionInAllowList = this.allow.some((ma) => {
        return ma.contains(connection.remoteAddr)
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
        try {
          await connection.close()
        } catch (err) {
          log.error(err)
        }
      })
    )

    // despatch prune event
    this.connectionManager.dispatchEvent(new CustomEvent('peer:prune', { detail: toClose.map(conn => conn.remotePeer) }))
  }
}

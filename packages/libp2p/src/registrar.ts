import { CodeError, codes } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import merge from 'merge-options'
import type { Libp2pEvents, PeerUpdate } from '@libp2p/interface'
import type { EventEmitter } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Topology } from '@libp2p/interface/topology'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { StreamHandlerOptions, StreamHandlerRecord, Registrar, StreamHandler } from '@libp2p/interface-internal/registrar'

const log = logger('libp2p:registrar')

export const DEFAULT_MAX_INBOUND_STREAMS = 32
export const DEFAULT_MAX_OUTBOUND_STREAMS = 64

export interface RegistrarComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  peerStore: PeerStore
  events: EventEmitter<Libp2pEvents>
}

/**
 * Responsible for notifying registered protocols of events in the network.
 */
export class DefaultRegistrar implements Registrar {
  private readonly topologies: Map<string, Map<string, Topology>>
  private readonly handlers: Map<string, StreamHandlerRecord>
  private readonly components: RegistrarComponents

  constructor (components: RegistrarComponents) {
    this.topologies = new Map()
    this.handlers = new Map()
    this.components = components

    this._onDisconnect = this._onDisconnect.bind(this)
    this._onPeerUpdate = this._onPeerUpdate.bind(this)
    this._onConnect = this._onConnect.bind(this)

    this.components.events.addEventListener('peer:disconnect', this._onDisconnect)
    this.components.events.addEventListener('peer:connect', this._onConnect)
    this.components.events.addEventListener('peer:update', this._onPeerUpdate)
  }

  getProtocols (): string[] {
    return Array.from(new Set<string>([
      ...this.handlers.keys()
    ])).sort()
  }

  getHandler (protocol: string): StreamHandlerRecord {
    const handler = this.handlers.get(protocol)

    if (handler == null) {
      throw new CodeError(`No handler registered for protocol ${protocol}`, codes.ERR_NO_HANDLER_FOR_PROTOCOL)
    }

    return handler
  }

  getTopologies (protocol: string): Topology[] {
    const topologies = this.topologies.get(protocol)

    if (topologies == null) {
      return []
    }

    return [
      ...topologies.values()
    ]
  }

  /**
   * Registers the `handler` for each protocol
   */
  async handle (protocol: string, handler: StreamHandler, opts?: StreamHandlerOptions): Promise<void> {
    if (this.handlers.has(protocol)) {
      throw new CodeError(`Handler already registered for protocol ${protocol}`, codes.ERR_PROTOCOL_HANDLER_ALREADY_REGISTERED)
    }

    const options = merge.bind({ ignoreUndefined: true })({
      maxInboundStreams: DEFAULT_MAX_INBOUND_STREAMS,
      maxOutboundStreams: DEFAULT_MAX_OUTBOUND_STREAMS
    }, opts)

    this.handlers.set(protocol, {
      handler,
      options
    })

    // Add new protocol to self protocols in the peer store
    await this.components.peerStore.merge(this.components.peerId, {
      protocols: [protocol]
    })
  }

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   */
  async unhandle (protocols: string | string[]): Promise<void> {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    protocolList.forEach(protocol => {
      this.handlers.delete(protocol)
    })

    // Update self protocols in the peer store
    await this.components.peerStore.patch(this.components.peerId, {
      protocols: this.getProtocols()
    })
  }

  /**
   * Register handlers for a set of multicodecs given
   */
  async register (protocol: string, topology: Topology): Promise<string> {
    if (topology == null) {
      throw new CodeError('invalid topology', codes.ERR_INVALID_PARAMETERS)
    }

    // Create topology
    const id = `${(Math.random() * 1e9).toString(36)}${Date.now()}`

    let topologies = this.topologies.get(protocol)

    if (topologies == null) {
      topologies = new Map<string, Topology>()
      this.topologies.set(protocol, topologies)
    }

    topologies.set(id, topology)

    return id
  }

  /**
   * Unregister topology
   */
  unregister (id: string): void {
    for (const [protocol, topologies] of this.topologies.entries()) {
      if (topologies.has(id)) {
        topologies.delete(id)

        if (topologies.size === 0) {
          this.topologies.delete(protocol)
        }
      }
    }
  }

  /**
   * Remove a disconnected peer from the record
   */
  _onDisconnect (evt: CustomEvent<PeerId>): void {
    const remotePeer = evt.detail

    void this.components.peerStore.get(remotePeer)
      .then(peer => {
        for (const protocol of peer.protocols) {
          const topologies = this.topologies.get(protocol)

          if (topologies == null) {
            // no topologies are interested in this protocol
            continue
          }

          for (const topology of topologies.values()) {
            topology.onDisconnect?.(remotePeer)
          }
        }
      })
      .catch(err => {
        if (err.code === codes.ERR_NOT_FOUND) {
          // peer has not completed identify so they are not in the peer store
          return
        }

        log.error('could not inform topologies of disconnecting peer %p', remotePeer, err)
      })
  }

  /**
   * On peer connected if we already have their protocols. Usually used for reconnects
   * as change:protocols event won't be emitted due to identical protocols.
   */
  _onConnect (evt: CustomEvent<PeerId>): void {
    const remotePeer = evt.detail

    void this.components.peerStore.get(remotePeer)
      .then(peer => {
        const connection = this.components.connectionManager.getConnections(peer.id)[0]

        if (connection == null) {
          log('peer %p connected but the connection manager did not have a connection', peer)
          // peer disconnected while we were loading their details from the peer store
          return
        }

        for (const protocol of peer.protocols) {
          const topologies = this.topologies.get(protocol)

          if (topologies == null) {
            // no topologies are interested in this protocol
            continue
          }

          for (const topology of topologies.values()) {
            topology.onConnect?.(remotePeer, connection)
          }
        }
      })
      .catch(err => {
        if (err.code === codes.ERR_NOT_FOUND) {
          // peer has not completed identify so they are not in the peer store
          return
        }

        log.error('could not inform topologies of connecting peer %p', remotePeer, err)
      })
  }

  /**
   * Check if a new peer support the multicodecs for this topology
   */
  _onPeerUpdate (evt: CustomEvent<PeerUpdate>): void {
    const { peer, previous } = evt.detail
    const removed = (previous?.protocols ?? []).filter(protocol => !peer.protocols.includes(protocol))
    const added = peer.protocols.filter(protocol => !(previous?.protocols ?? []).includes(protocol))

    for (const protocol of removed) {
      const topologies = this.topologies.get(protocol)

      if (topologies == null) {
        // no topologies are interested in this protocol
        continue
      }

      for (const topology of topologies.values()) {
        topology.onDisconnect?.(peer.id)
      }
    }

    for (const protocol of added) {
      const topologies = this.topologies.get(protocol)

      if (topologies == null) {
        // no topologies are interested in this protocol
        continue
      }

      for (const topology of topologies.values()) {
        const connection = this.components.connectionManager.getConnections(peer.id)[0]

        if (connection == null) {
          continue
        }
        topology.onConnect?.(peer.id, connection)
      }
    }
  }
}

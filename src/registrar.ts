import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from './errors.js'
import { isTopology, StreamHandlerOptions, StreamHandlerRecord } from '@libp2p/interface-registrar'
import merge from 'merge-options'
import type { Registrar, StreamHandler, Topology } from '@libp2p/interface-registrar'
import type { PeerProtocolsChangeData, PeerStore } from '@libp2p/interface-peer-store'
import type { Connection } from '@libp2p/interface-connection'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'

const log = logger('libp2p:registrar')

export const DEFAULT_MAX_INBOUND_STREAMS = 32
export const DEFAULT_MAX_OUTBOUND_STREAMS = 64

export interface RegistrarComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  peerStore: PeerStore
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
    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onConnect = this._onConnect.bind(this)

    this.components.connectionManager.addEventListener('peer:disconnect', this._onDisconnect)
    this.components.connectionManager.addEventListener('peer:connect', this._onConnect)

    // happens after identify
    this.components.peerStore.addEventListener('change:protocols', this._onProtocolChange)
  }

  getProtocols () {
    return Array.from(new Set<string>([
      ...this.topologies.keys(),
      ...this.handlers.keys()
    ])).sort()
  }

  getHandler (protocol: string) {
    const handler = this.handlers.get(protocol)

    if (handler == null) {
      throw errCode(new Error(`No handler registered for protocol ${protocol}`), codes.ERR_NO_HANDLER_FOR_PROTOCOL)
    }

    return handler
  }

  getTopologies (protocol: string) {
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
      throw errCode(new Error(`Handler already registered for protocol ${protocol}`), codes.ERR_PROTOCOL_HANDLER_ALREADY_REGISTERED)
    }

    const options = merge.bind({ ignoreUndefined: true })({
      maxInboundStreams: DEFAULT_MAX_INBOUND_STREAMS,
      maxOutboundStreams: DEFAULT_MAX_OUTBOUND_STREAMS
    }, opts)

    this.handlers.set(protocol, {
      handler,
      options
    })

    // Add new protocols to self protocols in the Protobook
    await this.components.peerStore.protoBook.add(this.components.peerId, [protocol])
  }

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   */
  async unhandle (protocols: string | string[]) {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    protocolList.forEach(protocol => {
      this.handlers.delete(protocol)
    })

    // Remove protocols from self protocols in the Protobook
    await this.components.peerStore.protoBook.remove(this.components.peerId, protocolList)
  }

  /**
   * Register handlers for a set of multicodecs given
   */
  async register (protocol: string, topology: Topology): Promise<string> {
    if (!isTopology(topology)) {
      log.error('topology must be an instance of interfaces/topology')
      throw errCode(new Error('topology must be an instance of interfaces/topology'), codes.ERR_INVALID_PARAMETERS)
    }

    // Create topology
    const id = `${(Math.random() * 1e9).toString(36)}${Date.now()}`

    let topologies = this.topologies.get(protocol)

    if (topologies == null) {
      topologies = new Map<string, Topology>()
      this.topologies.set(protocol, topologies)
    }

    topologies.set(id, topology)

    // Set registrar
    await topology.setRegistrar(this)

    return id
  }

  /**
   * Unregister topology
   */
  unregister (id: string) {
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
  _onDisconnect (evt: CustomEvent<Connection>) {
    const connection = evt.detail

    void this.components.peerStore.protoBook.get(connection.remotePeer)
      .then(peerProtocols => {
        for (const protocol of peerProtocols) {
          const topologies = this.topologies.get(protocol)

          if (topologies == null) {
            // no topologies are interested in this protocol
            continue
          }

          for (const topology of topologies.values()) {
            topology.onDisconnect(connection.remotePeer)
          }
        }
      })
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * On peer connected if we already have their protocols. Usually used for reconnects
   * as change:protocols event won't be emitted due to identical protocols.
   */
  _onConnect (evt: CustomEvent<Connection>) {
    const connection = evt.detail

    void this.components.peerStore.protoBook.get(connection.remotePeer)
      .then(peerProtocols => {
        for (const protocol of peerProtocols) {
          const topologies = this.topologies.get(protocol)

          if (topologies == null) {
            // no topologies are interested in this protocol
            continue
          }

          for (const topology of topologies.values()) {
            topology.onConnect(connection.remotePeer, connection)
          }
        }
      })
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * Check if a new peer support the multicodecs for this topology
   */
  _onProtocolChange (evt: CustomEvent<PeerProtocolsChangeData>) {
    const { peerId, protocols, oldProtocols } = evt.detail
    const removed = oldProtocols.filter(protocol => !protocols.includes(protocol))
    const added = protocols.filter(protocol => !oldProtocols.includes(protocol))

    for (const protocol of removed) {
      const topologies = this.topologies.get(protocol)

      if (topologies == null) {
        // no topologies are interested in this protocol
        continue
      }

      for (const topology of topologies.values()) {
        topology.onDisconnect(peerId)
      }
    }

    for (const protocol of added) {
      const topologies = this.topologies.get(protocol)

      if (topologies == null) {
        // no topologies are interested in this protocol
        continue
      }

      for (const topology of topologies.values()) {
        const connection = this.components.connectionManager.getConnections(peerId)[0]

        if (connection == null) {
          continue
        }
        topology.onConnect(peerId, connection)
      }
    }
  }
}

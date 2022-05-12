import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from './errors.js'
import { isTopology, Topology } from '@libp2p/interfaces/topology'
import type { Registrar, StreamHandler } from '@libp2p/interfaces/registrar'
import type { PeerProtocolsChangeData } from '@libp2p/interfaces/peer-store'
import type { Connection } from '@libp2p/interfaces/connection'
import type { Components } from '@libp2p/interfaces/components'

const log = logger('libp2p:registrar')

function supportsProtocol (peerProtocols: string[], topologyProtocols: string[]) {
  for (const peerProtocol of peerProtocols) {
    if (topologyProtocols.includes(peerProtocol)) {
      return true
    }
  }

  return false
}

/**
 * Responsible for notifying registered protocols of events in the network.
 */
export class DefaultRegistrar implements Registrar {
  private readonly topologies: Map<string, { topology: Topology, protocols: string[] }>
  private readonly handlers: Map<string, StreamHandler>
  private readonly components: Components

  constructor (components: Components) {
    this.topologies = new Map()
    this.handlers = new Map()
    this.components = components

    this._onDisconnect = this._onDisconnect.bind(this)
    this._onProtocolChange = this._onProtocolChange.bind(this)

    this.components.getConnectionManager().addEventListener('peer:disconnect', this._onDisconnect)

    // happens after identify
    this.components.getPeerStore().addEventListener('change:protocols', this._onProtocolChange)
  }

  getProtocols () {
    const protocols = new Set<string>()

    for (const topology of this.topologies.values()) {
      topology.protocols.forEach(protocol => protocols.add(protocol))
    }

    for (const protocol of this.handlers.keys()) {
      protocols.add(protocol)
    }

    return Array.from(protocols).sort()
  }

  getHandler (protocol: string) {
    const handler = this.handlers.get(protocol)

    if (handler == null) {
      throw new Error(`No handler registered for protocol ${protocol}`)
    }

    return handler
  }

  getTopologies (protocol: string) {
    const output: Topology[] = []

    for (const { topology, protocols } of this.topologies.values()) {
      if (protocols.includes(protocol)) {
        output.push(topology)
      }
    }

    return output
  }

  /**
   * Registers the `handler` for each protocol
   */
  async handle (protocols: string | string[], handler: StreamHandler): Promise<void> {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    for (const protocol of protocolList) {
      if (this.handlers.has(protocol)) {
        throw errCode(new Error(`Handler already registered for protocol ${protocol}`), codes.ERR_PROTOCOL_HANDLER_ALREADY_REGISTERED)
      }

      this.handlers.set(protocol, handler)
    }

    // Add new protocols to self protocols in the Protobook
    await this.components.getPeerStore().protoBook.add(this.components.getPeerId(), protocolList)
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
    await this.components.getPeerStore().protoBook.remove(this.components.getPeerId(), protocolList)
  }

  /**
   * Register handlers for a set of multicodecs given
   */
  async register (protocols: string | string[], topology: Topology): Promise<string> {
    if (!isTopology(topology)) {
      log.error('topology must be an instance of interfaces/topology')
      throw errCode(new Error('topology must be an instance of interfaces/topology'), codes.ERR_INVALID_PARAMETERS)
    }

    // Create topology
    const id = `${(Math.random() * 1e9).toString(36)}${Date.now()}`

    this.topologies.set(id, {
      topology,
      protocols: Array.isArray(protocols) ? protocols : [protocols]
    })

    // Set registrar
    await topology.setRegistrar(this)

    return id
  }

  /**
   * Unregister topology
   */
  unregister (id: string) {
    this.topologies.delete(id)
  }

  /**
   * Remove a disconnected peer from the record
   */
  _onDisconnect (evt: CustomEvent<Connection>) {
    const connection = evt.detail

    void this.components.getPeerStore().protoBook.get(connection.remotePeer)
      .then(peerProtocols => {
        for (const { topology, protocols } of this.topologies.values()) {
          if (supportsProtocol(peerProtocols, protocols)) {
            topology.onDisconnect(connection.remotePeer)
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

    for (const { topology, protocols } of this.topologies.values()) {
      if (supportsProtocol(removed, protocols)) {
        topology.onDisconnect(peerId)
      }
    }

    for (const { topology, protocols } of this.topologies.values()) {
      if (supportsProtocol(added, protocols)) {
        const connection = this.components.getConnectionManager().getConnections(peerId)[0]

        if (connection == null) {
          continue
        }

        topology.onConnect(peerId, connection)
      }
    }
  }
}

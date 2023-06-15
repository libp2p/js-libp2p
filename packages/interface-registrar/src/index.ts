import type { Connection, Stream } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'

export interface IncomingStreamData {
  stream: Stream
  connection: Connection
}

export interface StreamHandler {
  (data: IncomingStreamData): void
}

export interface StreamHandlerOptions {
  /**
   * How many incoming streams can be open for this protocol at the same time on each connection (default: 32)
   */
  maxInboundStreams?: number

  /**
   * How many outgoing streams can be open for this protocol at the same time on each connection (default: 64)
   */
  maxOutboundStreams?: number
}

export interface StreamHandlerRecord {
  handler: StreamHandler
  options: StreamHandlerOptions
}

export interface Registrar {
  /**
   * Return the list of protocols with registered handlers
   */
  getProtocols: () => string[]

  /**
   * Add a protocol handler
   */
  handle: (protocol: string, handler: StreamHandler, options?: StreamHandlerOptions) => Promise<void>

  /**
   * Remove a protocol handler
   */
  unhandle: (protocol: string) => Promise<void>

  /**
   * Return the handler for the passed protocol
   */
  getHandler: (protocol: string) => StreamHandlerRecord

  /**
   * Register a topology handler for a protocol - the topology will be
   * invoked when peers are discovered on the network that support the
   * passed protocol.
   *
   * An id will be returned that can later be used to unregister the
   * topology.
   */
  register: (protocol: string, topology: Topology) => Promise<string>

  /**
   * Remove the topology handler with the passed id.
   */
  unregister: (id: string) => void

  /**
   * Return all topology handlers that wish to be informed about peers
   * that support the passed protocol.
   */
  getTopologies: (protocol: string) => Topology[]
}

export interface onConnectHandler {
  (peerId: PeerId, conn: Connection): void
}

export interface onDisconnectHandler {
  (peerId: PeerId, conn?: Connection): void
}

export interface TopologyInit {
  /**
   * minimum needed connections
   */
  min?: number

  /**
   * maximum needed connections
   */
  max?: number

  /**
   * Invoked when a new peer is connects that supports the configured
   * protocol
   */
  onConnect?: onConnectHandler

  /**
   * Invoked when a peer that supports the configured protocol disconnects
   */
  onDisconnect?: onDisconnectHandler
}

export interface Topology {
  min: number
  max: number
  peers: Set<string>

  onConnect: (peerId: PeerId, conn: Connection) => void
  onDisconnect: (peerId: PeerId) => void
  setRegistrar: (registrar: Registrar) => Promise<void>
}

export const topologySymbol = Symbol.for('@libp2p/topology')

export function isTopology (other: any): other is Topology {
  return other != null && Boolean(other[topologySymbol])
}

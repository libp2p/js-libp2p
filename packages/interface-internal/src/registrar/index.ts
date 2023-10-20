import type { Connection, Stream } from '@libp2p/interface/connection'
import type { Topology } from '@libp2p/interface/topology'

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

  /**
   * If true, allow this protocol to run on limited connections (e.g.
   * connections with data or duration limits such as circuit relay
   * connections) (default: false)
   */
  runOnTransientConnection?: boolean
}

export interface StreamHandlerRecord {
  handler: StreamHandler
  options: StreamHandlerOptions
}

export interface Registrar {
  /**
   * Return the list of protocols with registered handlers
   */
  getProtocols(): string[]

  /**
   * Add a protocol handler
   */
  handle(protocol: string, handler: StreamHandler, options?: StreamHandlerOptions): Promise<void>

  /**
   * Remove a protocol handler
   */
  unhandle(protocol: string): Promise<void>

  /**
   * Return the handler for the passed protocol
   */
  getHandler(protocol: string): StreamHandlerRecord

  /**
   * Register a topology handler for a protocol - the topology will be
   * invoked when peers are discovered on the network that support the
   * passed protocol.
   *
   * An id will be returned that can later be used to unregister the
   * topology.
   */
  register(protocol: string, topology: Topology): Promise<string>

  /**
   * Remove the topology handler with the passed id.
   */
  unregister(id: string): void

  /**
   * Return all topology handlers that wish to be informed about peers
   * that support the passed protocol.
   */
  getTopologies(protocol: string): Topology[]
}

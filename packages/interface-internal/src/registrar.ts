import type { StreamHandler, StreamHandlerOptions, StreamHandlerRecord, Topology, IncomingStreamData } from '@libp2p/interface'

export type {
  /**
   * @deprecated This type should be imported from @libp2p/interface directly
   */
  IncomingStreamData,

  /**
   * @deprecated This type should be imported from @libp2p/interface directly
   */
  StreamHandler,

  /**
   * @deprecated This type should be imported from @libp2p/interface directly
   */
  StreamHandlerOptions,

  /**
   * @deprecated This type should be imported from @libp2p/interface directly
   */
  StreamHandlerRecord
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

import type { StreamHandler, StreamHandlerOptions, StreamHandlerRecord, Topology, IncomingStreamData } from '@libp2p/interface'
import type { AbortOptions } from '@multiformats/multiaddr'

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

/**
 * The `Registrar` provides an interface for registering protocol handlers -
 * these are invoked when remote peers open streams on the local node with the
 * corresponding protocol name.
 *
 * It also allows configuring network topologies for a given protocol(s). The
 * topology callbacks are invoked when a peer that supports those protocols
 * connects or disconnects.
 *
 * The Identify protocol must be configured on the current node for topologies
 * to function.
 */
export interface Registrar {
  /**
   * Retrieve the list of registered protocol handlers.
   *
   * @returns An array of protocol strings.
   */
  getProtocols(): string[]

  /**
   * Register a handler for a specific protocol.
   *
   * @param protocol - The protocol string (e.g., `/my-protocol/1.0.0`).
   * @param handler - The function that handles incoming streams.
   * @param options - Optional configuration options for the handler.
   * @returns A promise that resolves once the handler is registered.
   */
  handle(protocol: string, handler: StreamHandler, options?: StreamHandlerOptions): Promise<void>

  /**
   * Remove a registered protocol handler.
   *
   * @param protocol - The protocol to unhandle.
   * @returns A promise that resolves once the handler is removed.
   */
  unhandle(protocol: string, options?: AbortOptions): Promise<void>

  /**
   * Retrieve the registered handler for a given protocol.
   *
   * @param protocol - The protocol to query.
   * @returns A `StreamHandlerRecord` containing the handler and options.
   */
  getHandler(protocol: string): StreamHandlerRecord

  /**
   * Register a topology handler for a protocol - the topology will be
   * invoked when peers are discovered on the network that support the
   * passed protocol.
   *
   * An id will be returned that can later be used to unregister the
   * topology.
   *
   * @param protocol - The protocol to register.
   * @param topology - The topology handler to register.
   * @returns A promise resolving to a unique ID for the registered topology.
   */
  register(protocol: string, topology: Topology, options?: AbortOptions): Promise<string>

  /**
   * Unregister a topology handler using its unique ID.
   *
   * @param id - The ID of the topology to unregister.
   */
  unregister(id: string): void

  /**
   * Retrieve all topology handlers that are interested in peers
   * supporting a given protocol.
   *
   * @param protocol - The protocol to query.
   * @returns An array of registered `Topology` handlers.
   */
  getTopologies(protocol: string): Topology[]
}

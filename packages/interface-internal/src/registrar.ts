import type { StreamHandler, StreamHandlerOptions, StreamHandlerRecord, Topology, IncomingStreamData } from '@libp2p/interface'

/**
 * Deprecated types that should be imported from `@libp2p/interface` directly.
 *
 * These exports ensure backward compatibility but should be avoided in new code.
 */
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
 * @packageDocumentation
 *
 * The `Registrar` module provides an interface for managing protocol handlers
 * and topologies in a libp2p network. It enables registering and managing
 * protocol-specific handlers, ensuring efficient peer-to-peer communication.
 */
/**
 * The `Registrar` interface allows modules to register, manage, and remove
 * protocol handlers and topology discovery mechanisms in libp2p.
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
  unhandle(protocol: string): Promise<void>

  /**
   * Retrieve the registered handler for a given protocol.
   *
   * @param protocol - The protocol to query.
   * @returns A `StreamHandlerRecord` containing the handler and options.
   */
  getHandler(protocol: string): StreamHandlerRecord

  /**
   * Register a topology handler for a specific protocol.
   *
   * The topology will be notified when peers supporting the protocol
   * are discovered on the network.
   *
   * @param protocol - The protocol to register.
   * @param topology - The topology handler to register.
   * @returns A promise resolving to a unique ID for the registered topology.
   */
  register(protocol: string, topology: Topology): Promise<string>

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

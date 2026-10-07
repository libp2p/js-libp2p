import type { StreamHandler, StreamHandlerOptions, StreamHandlerRecord, Topology, StreamMiddleware, AbortOptions } from '@libp2p/interface'

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
   * Append global middleware, invoked before protocol-specific middleware.
   * This does not register a handler or advertise protocol support.
   */
  use(middleware: StreamMiddleware): void

  /**
   * Replace the middleware registered for a protocol.
   */
  use(protocol: string, middleware: StreamMiddleware[]): void

  /**
   * Remove protocol-specific middleware when passed a string, or all global
   * registrations of the given middleware when passed a function.
   */
  unuse(protocol: string | StreamMiddleware): void

  /**
   * Return a fresh chain with global middleware before protocol-specific middleware.
   * Mutating the result does not change registered middleware.
   */
  getMiddleware(protocol: string): StreamMiddleware[]

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

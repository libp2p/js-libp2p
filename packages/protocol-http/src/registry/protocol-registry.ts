/**
 * Protocol registry for libp2p HTTP protocols
 * Provides a registry of protocols supported by the libp2p HTTP server
 */
import type { Logger, ComponentLogger } from '@libp2p/interface'

/**
 * Protocol information structure
 */
export interface ProtocolInfo {
  /** Protocol identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Protocol description */
  description: string
  /** Protocol version */
  version: string
  /** Protocol URL or specification link */
  url?: string
}

/**
 * Registry for HTTP protocols supported by the node
 */
export class ProtocolRegistry {
  private readonly log: Logger
  private readonly protocols: Map<string, ProtocolInfo>

  constructor (logger: ComponentLogger) {
    this.log = logger.forComponent('libp2p:http:protocol-registry')
    this.protocols = new Map()
  }

  /**
   * Register a protocol with the registry
   */
  registerProtocol (protocol: ProtocolInfo): void {
    this.log.trace('registering protocol: %s', protocol.id)
    this.protocols.set(protocol.id, protocol)
  }

  /**
   * Unregister a protocol from the registry
   */
  unregisterProtocol (id: string): void {
    this.log.trace('unregistering protocol: %s', id)
    this.protocols.delete(id)
  }

  /**
   * Get a protocol by its identifier
   */
  getProtocol (id: string): ProtocolInfo | undefined {
    return this.protocols.get(id)
  }

  /**
   * Get all registered protocols
   */
  getAllProtocols (): ProtocolInfo[] {
    return Array.from(this.protocols.values())
  }
}

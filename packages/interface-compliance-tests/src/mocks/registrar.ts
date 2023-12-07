import merge from 'merge-options'
import type { Connection, PeerId, Topology } from '@libp2p/interface'
import type { IncomingStreamData, Registrar, StreamHandler, StreamHandlerOptions, StreamHandlerRecord } from '@libp2p/interface-internal'

export class MockRegistrar implements Registrar {
  private readonly topologies = new Map<string, Array<{ id: string, topology: Topology }>>()
  private readonly handlers = new Map<string, StreamHandlerRecord>()

  getProtocols (): string[] {
    return Array.from(this.handlers.keys()).sort()
  }

  async handle (protocol: string, handler: StreamHandler, opts?: StreamHandlerOptions): Promise<void> {
    const options = merge.bind({ ignoreUndefined: true })({
      maxInboundStreams: 1,
      maxOutboundStreams: 1
    }, opts)

    if (this.handlers.has(protocol)) {
      throw new Error(`Handler already registered for protocol ${protocol}`)
    }

    this.handlers.set(protocol, {
      handler,
      options
    })
  }

  async unhandle (protocol: string): Promise<void> {
    this.handlers.delete(protocol)
  }

  getHandler (protocol: string): StreamHandlerRecord {
    const handler = this.handlers.get(protocol)

    if (handler == null) {
      throw new Error(`No handler registered for protocol ${protocol}`)
    }

    return handler
  }

  async register (protocol: string, topology: Topology): Promise<string> {
    const id = `topology-id-${Math.random()}`
    let topologies = this.topologies.get(protocol)

    if (topologies == null) {
      topologies = []
    }

    topologies.push({
      id,
      topology
    })

    this.topologies.set(protocol, topologies)

    return id
  }

  unregister (id: string | string[]): void {
    if (!Array.isArray(id)) {
      id = [id]
    }

    id.forEach(id => this.topologies.delete(id))
  }

  getTopologies (protocol: string): Topology[] {
    return (this.topologies.get(protocol) ?? []).map(t => t.topology)
  }
}

export function mockRegistrar (): Registrar {
  return new MockRegistrar()
}

export async function mockIncomingStreamEvent (protocol: string, conn: Connection, remotePeer: PeerId): Promise<IncomingStreamData> {
  return {
    ...await conn.newStream([protocol]),
    // @ts-expect-error incomplete implementation
    connection: {
      remotePeer
    }
  }
}

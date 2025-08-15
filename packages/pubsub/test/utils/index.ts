import { duplexPair } from 'it-pair/duplex'
import { PubSubBaseProtocol } from '../../src/index.js'
import { RPC } from '../message/rpc.js'
import type { Connection, PublishResult, PubSubRPC, PubSubRPCMessage, Topology, StreamHandler, StreamHandlerRecord, PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import { streamPair } from '@libp2p/utils'
import { stubInterface } from 'sinon-ts'

export class PubsubImplementation extends PubSubBaseProtocol {
  async publishMessage (): Promise<PublishResult> {
    return {
      recipients: []
    }
  }

  decodeRpc (bytes: Uint8Array): PubSubRPC {
    return RPC.decode(bytes)
  }

  encodeRpc (rpc: PubSubRPC): Uint8Array {
    return RPC.encode(rpc)
  }

  decodeMessage (bytes: Uint8Array): PubSubRPCMessage {
    return RPC.Message.decode(bytes)
  }

  encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
    return RPC.Message.encode(rpc)
  }
}

export class MockRegistrar implements Registrar {
  private readonly topologies = new Map<string, { topology: Topology, protocols: string[] }>()
  private readonly handlers = new Map<string, StreamHandler>()

  getProtocols (): string[] {
    const protocols = new Set<string>()

    for (const topology of this.topologies.values()) {
      topology.protocols.forEach(protocol => protocols.add(protocol))
    }

    for (const protocol of this.handlers.keys()) {
      protocols.add(protocol)
    }

    return Array.from(protocols).sort()
  }

  async handle (protocols: string | string[], handler: StreamHandler): Promise<void> {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    for (const protocol of protocolList) {
      if (this.handlers.has(protocol)) {
        throw new Error(`Handler already registered for protocol ${protocol}`)
      }

      this.handlers.set(protocol, handler)
    }
  }

  async unhandle (protocols: string | string[]): Promise<void> {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    protocolList.forEach(protocol => {
      this.handlers.delete(protocol)
    })
  }

  getHandler (protocol: string): StreamHandlerRecord {
    const handler = this.handlers.get(protocol)

    if (handler == null) {
      throw new Error(`No handler registered for protocol ${protocol}`)
    }

    return { handler, options: {} }
  }

  async register (protocols: string | string[], topology: Topology): Promise<string> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    const id = `topology-id-${Math.random()}`

    this.topologies.set(id, {
      topology,
      protocols
    })

    return id
  }

  unregister (id: string | string[]): void {
    if (!Array.isArray(id)) {
      id = [id]
    }

    id.forEach(id => this.topologies.delete(id))
  }

  getTopologies (protocol: string): Topology[] {
    const output: Topology[] = []

    for (const { topology, protocols } of this.topologies.values()) {
      if (protocols.includes(protocol)) {
        output.push(topology)
      }
    }

    if (output.length > 0) {
      return output
    }

    throw new Error(`No topologies registered for protocol ${protocol}`)
  }
}

/**
 * Returns two connections:
 *
 * 1. peerA -> peerB
 * 2. peerB -> peerA
 */
export const connectionPair = async (peerA: PeerId, peerB: PeerId): Promise<[Connection, Connection]> => {
  const [d0, d1] = await streamPair()

  return [
    stubInterface<Connection>({
      newStream: async () => d0,
      streams: [],
      remotePeer: peerB
    }),
    stubInterface<Connection>({
      newStream: async () => d1,
      streams: [],
      remotePeer: peerA
    })
  ]
}

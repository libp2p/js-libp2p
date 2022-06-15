import { duplexPair } from 'it-pair/duplex'
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { PubSubBaseProtocol } from '../../src/index.js'
import { RPC } from '../message/rpc.js'
import type { IncomingStreamData, Registrar, StreamHandler, StreamHandlerRecord, Topology } from '@libp2p/interface-registrar'
import type { Connection } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PubSubRPC, PubSubRPCMessage } from '@libp2p/interface-pubsub'

export const createPeerId = async (): Promise<PeerId> => {
  const peerId = await PeerIdFactory.createEd25519PeerId()

  return peerId
}

export class PubsubImplementation extends PubSubBaseProtocol {
  async publishMessage () {
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
  private readonly topologies: Map<string, { topology: Topology, protocols: string[] }> = new Map()
  private readonly handlers: Map<string, StreamHandler> = new Map()

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

  async handle (protocols: string | string[], handler: StreamHandler): Promise<void> {
    const protocolList = Array.isArray(protocols) ? protocols : [protocols]

    for (const protocol of protocolList) {
      if (this.handlers.has(protocol)) {
        throw new Error(`Handler already registered for protocol ${protocol}`)
      }

      this.handlers.set(protocol, handler)
    }
  }

  async unhandle (protocols: string | string[]) {
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

  async register (protocols: string | string[], topology: Topology) {
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

  unregister (id: string | string[]) {
    if (!Array.isArray(id)) {
      id = [id]
    }

    id.forEach(id => this.topologies.delete(id))
  }

  getTopologies (protocol: string) {
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

export const ConnectionPair = (): [Connection, Connection] => {
  const [d0, d1] = duplexPair<Uint8Array>()

  return [
    {
      // @ts-expect-error incomplete implementation
      newStream: async (protocol: string[]) => await Promise.resolve({
        protocol: protocol[0],
        stream: d0
      })
    },
    {
      // @ts-expect-error incomplete implementation
      newStream: async (protocol: string[]) => await Promise.resolve({
        protocol: protocol[0],
        stream: d1
      })
    }
  ]
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

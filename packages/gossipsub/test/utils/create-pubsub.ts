import { setMaxListeners } from 'events'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger, prefixLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { mockMuxer, multiaddrConnectionPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core'
import { stubInterface } from 'sinon-ts'
import { GossipSub as GossipSubClass } from '../../src/gossipsub.ts'
import { gossipsub } from '../../src/index.js'
import type { GossipsubOpts } from '../../src/index.js'
import type { TypedEventTarget, Libp2pEvents, PeerStore, PrivateKey, PeerId, ComponentLogger, Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

export interface CreateComponentsOpts {
  init?: Partial<GossipsubOpts>
  pubsub?(init?: any): (components: any) => GossipSubClass
  logPrefix?: string
}

export interface GossipSubTestComponents {
  privateKey: PrivateKey
  peerId: PeerId
  peerStore: PeerStore
  registrar: StubbedInstance<Registrar>
  connectionManager: ConnectionManager
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
}

export interface GossipSubAndComponents {
  pubsub: GossipSubClass
  components: GossipSubTestComponents
}

const peersById = new Map<string, GossipSubAndComponents>()
const connectionsById = new Map<string, Connection[]>()

const addConnection = (peerId: string, connection: Connection): void => {
  const connections = connectionsById.get(peerId) ?? []
  if (!connections.some((conn) => conn.remotePeer.equals(connection.remotePeer))) {
    connections.push(connection)
    connectionsById.set(peerId, connections)
  }
}

const removeConnectionsToPeer = (peerId: string, remotePeerId: string): Connection[] => {
  const existing = connectionsById.get(peerId) ?? []
  const removed = existing.filter((conn) => conn.remotePeer.toString() === remotePeerId)
  const next = existing.filter((conn) => conn.remotePeer.toString() !== remotePeerId)
  connectionsById.set(peerId, next)
  return removed
}

export const createComponents = async (opts: CreateComponentsOpts): Promise<GossipSubAndComponents> => {
  const fn = opts.pubsub ?? gossipsub
  const privateKey = await generateKeyPair('Ed25519')
  const peerId = peerIdFromPrivateKey(privateKey)
  const peerIdStr = peerId.toString()

  const events = new TypedEventEmitter<Libp2pEvents>()
  const logger = opts.logPrefix == null ? defaultLogger() : prefixLogger(opts.logPrefix)
  const registrar = stubInterface<Registrar>()

  const connectionManager = stubInterface<ConnectionManager>({
    getConnections: (remotePeer?: PeerId) => {
      const connections = connectionsById.get(peerIdStr) ?? []

      if (remotePeer == null) {
        return connections
      }

      return connections.filter((conn) => conn.remotePeer.equals(remotePeer))
    },
    closeConnections: async (remotePeer: PeerId) => {
      const remotePeerId = remotePeer.toString()
      removeConnectionsToPeer(peerIdStr, remotePeerId)

      for (const protocol of getPubsubProtocols(peersById.get(peerIdStr)?.pubsub)) {
        const topologies = registrar.getTopologies(protocol) ?? []
        for (const topology of topologies) {
          topology.onDisconnect?.(remotePeer)
        }
      }
    },
    openConnection: async (remotePeer: PeerId) => {
      const existing = (connectionsById.get(peerIdStr) ?? []).find((conn) => conn.remotePeer.equals(remotePeer))

      if (existing != null) {
        return existing
      }

      const local = peersById.get(peerIdStr)
      const remote = peersById.get(remotePeer.toString())

      if (local == null || remote == null) {
        throw new Error(`Unknown peer ${remotePeer}`)
      }

      await connectPubsubNodes(local, remote)

      const created = (connectionsById.get(peerIdStr) ?? []).find((conn) => conn.remotePeer.equals(remotePeer))

      if (created == null) {
        throw new Error(`Could not connect to peer ${remotePeer}`)
      }

      return created
    }
  })

  const components: GossipSubTestComponents = {
    privateKey,
    peerId,
    registrar,
    connectionManager,
    peerStore: persistentPeerStore({
      peerId,
      datastore: new MemoryDatastore(),
      events,
      logger
    }),
    events,
    logger
  }

  registrar.getTopologies.callsFake((protocol) => {
    return registrar.register.getCalls()
      .filter((call) => call.args[0] === protocol)
      .map((call) => call.args[1])
  })

  const pubsub = fn(opts.init)(components) as GossipSubClass

  const output = { pubsub, components }
  peersById.set(peerIdStr, output)
  connectionsById.set(peerIdStr, [])

  await start(...Object.entries(components), pubsub)

  try {
    // not available everywhere
    setMaxListeners(Infinity, pubsub)
  } catch {}

  return output
}

export const createComponentsArray = async (
  opts: CreateComponentsOpts & { number: number, connected?: boolean } = { number: 1, connected: true }
): Promise<GossipSubAndComponents[]> => {
  const output = await Promise.all(
    Array.from({ length: opts.number }).map(async (_, i) =>
      createComponents({ ...opts, init: { ...opts.init, debugName: `libp2p:gossipsub:${i}` } })
    )
  )

  if (opts.connected ?? false) {
    await connectAllPubSubNodes(output)
  }

  return output
}

const getPubsubProtocols = (pubsub: any): string[] => {
  if (Array.isArray(pubsub.protocols)) {
    return pubsub.protocols
  }

  if (typeof pubsub.protocol === 'string') {
    return [pubsub.protocol]
  }

  throw new Error('Pubsub protocols not found')
}

const selectProtocol = (protocols: string[], remoteProtocols: string[]): string => {
  for (const protocol of protocols) {
    if (remoteProtocols.includes(protocol)) {
      return protocol
    }
  }

  throw new Error('No protocol found')
}

export const connectPubsubNodes = async (a: GossipSubAndComponents, b: GossipSubAndComponents): Promise<void> => {
  const aProtocols = getPubsubProtocols(a.pubsub)
  const bProtocols = getPubsubProtocols(b.pubsub)

  const [outboundMultiaddrConnection, inboundMultiaddrConnection] = multiaddrConnectionPair()
  const localMuxer = mockMuxer().createStreamMuxer(outboundMultiaddrConnection)
  const remoteMuxer = mockMuxer().createStreamMuxer(inboundMultiaddrConnection)

  // TODO: need to do multistream select here because gossipsub supports
  // multiple protocols and one of a or b could be running floodsub

  localMuxer.addEventListener('stream', (evt) => {
    let handled = false

    for (const call of a.components.registrar.handle.getCalls()) {
      if (call.args[0] === evt.detail.protocol) {
        call.args[1](evt.detail, outboundConnection)
        handled = true
        break
      }
    }

    if (!handled && evt.detail.protocol === '') {
      const fallback = a.components.registrar.handle
        .getCalls()
        .find((call) => aProtocols.includes(call.args[0]))

      fallback?.args[1](evt.detail, outboundConnection)
    }
  })

  remoteMuxer.addEventListener('stream', (evt) => {
    let handled = false

    for (const call of b.components.registrar.handle.getCalls()) {
      if (call.args[0] === evt.detail.protocol) {
        call.args[1](evt.detail, inboundConnection)
        handled = true
        break
      }
    }

    if (!handled && evt.detail.protocol === '') {
      const fallback = b.components.registrar.handle
        .getCalls()
        .find((call) => bProtocols.includes(call.args[0]))

      fallback?.args[1](evt.detail, inboundConnection)
    }
  })

  const outboundConnection = stubInterface<Connection>({
    newStream: async (protocols, options) => {
      const protocolList = Array.isArray(protocols) ? protocols : [protocols]
      const protocol = selectProtocol(protocolList, bProtocols)
      const stream = await localMuxer.createStream({
        protocol
      })

      ;(stream as any).protocol = protocol

      return stream
    },
    status: 'open',
    direction: 'outbound',
    streams: [],
    remotePeer: b.components.peerId,
    remoteAddr: multiaddr('/memory/1234')
  })

  const inboundConnection = stubInterface<Connection>({
    newStream: async (protocols, options) => {
      const protocolList = Array.isArray(protocols) ? protocols : [protocols]
      const protocol = selectProtocol(protocolList, aProtocols)
      const stream = await remoteMuxer.createStream({
        protocol
      })

      ;(stream as any).protocol = protocol

      return stream
    },
    status: 'open',
    direction: 'inbound',
    streams: [],
    remotePeer: a.components.peerId,
    remoteAddr: multiaddr('/memory/5678')
  })

  for (const multicodec of bProtocols) {
    for (const call of a.components.registrar.register.getCalls()) {
      if (call.args[0] === multicodec) {
        call.args[1].onConnect?.(b.components.peerId, outboundConnection)
      }
    }
  }

  for (const multicodec of aProtocols) {
    for (const call of b.components.registrar.register.getCalls()) {
      if (call.args[0] === multicodec) {
        call.args[1].onConnect?.(a.components.peerId, inboundConnection)
      }
    }
  }

  addConnection(a.components.peerId.toString(), outboundConnection)
  addConnection(b.components.peerId.toString(), inboundConnection)

  a.components.events.safeDispatchEvent('peer:connect', { detail: outboundConnection.remotePeer })
  b.components.events.safeDispatchEvent('peer:connect', { detail: inboundConnection.remotePeer })
}

export const connectAllPubSubNodes = async (components: GossipSubAndComponents[]): Promise<void> => {
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      await connectPubsubNodes(components[i], components[j])
    }
  }
}

/**
 * Connect some gossipsub nodes to others, ensure each has num peers
 *
 * @param {GossipSubAndComponents[]} gss
 * @param {number} num - number of peers to connect
 */
export async function connectSome (gss: GossipSubAndComponents[], num: number): Promise<void> {
  for (let i = 0; i < gss.length; i++) {
    let count = 0
    // merely do a Math.random() and check for duplicate may take a lot of time to run a test
    // so we make an array of candidate peers
    // initially, don't populate i as a candidate to connect: candidatePeers[i] = i + 1
    const candidatePeers = Array.from({ length: gss.length - 1 }, (_, j) => (j >= i ? j + 1 : j))
    while (count < num) {
      const n = Math.floor(Math.random() * candidatePeers.length)
      const peer = candidatePeers[n]
      await connectPubsubNodes(gss[i], gss[peer])
      // after connecting to a peer, update candidatePeers so that we don't connect to it again
      for (let j = n; j < candidatePeers.length - 1; j++) {
        candidatePeers[j] = candidatePeers[j + 1]
      }
      // remove the last item
      candidatePeers.splice(candidatePeers.length - 1, 1)
      count++
    }
  }
}

export async function sparseConnect (gss: GossipSubAndComponents[]): Promise<void> {
  await connectSome(gss, 3)
}

export async function denseConnect (gss: GossipSubAndComponents[]): Promise<void> {
  await connectSome(gss, Math.min(gss.length - 1, 10))
}

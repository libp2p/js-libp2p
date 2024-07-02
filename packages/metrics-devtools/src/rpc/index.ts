import { cidCodec } from './codecs/cid.js'
import { customProgressEventCodec } from './codecs/custom-progress-event.js'
import { multiaddrCodec } from './codecs/multiaddr.js'
import { peerIdCodec } from './codecs/peer-id.js'
import type { ContentRouting, PeerId, PeerRouting, AbortOptions } from '@libp2p/interface'
import type { OpenConnectionOptions } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ValueCodec } from 'it-rpc'

export const valueCodecs: Array<ValueCodec<any>> = [
  cidCodec,
  multiaddrCodec,
  peerIdCodec,
  customProgressEventCodec
]

export interface NodeAddress {
  multiaddr: Multiaddr
  listen?: boolean
  announce?: boolean
  observed?: boolean
  default?: boolean
}

export interface NodeStatus {
  peerId: PeerId
  agent?: string
  addresses: NodeAddress[]
  protocols: string[]
}

export interface PeerAddress {
  multiaddr: Multiaddr
  isConnected?: boolean
  isCertified?: boolean
}

export interface Peer {
  /**
   * The identifier of the remote peer
   */
  id: PeerId

  /**
   * The list of addresses the peer has that we know about
   */
  addresses: PeerAddress[]

  /**
   * Any peer store tags the peer has
   */
  tags: Record<string, number>

  /**
   * Any peer store metadata the peer has
   */
  metadata: Record<string, string>

  /**
   * The protocols the peer supports, if known
   */
  protocols: string[]
}

/**
 * RPC operations exposed by the metrics
 */
export interface MetricsRPC {
  /**
   * Called by DevTools on initial connect
   */
  init(options?: AbortOptions): Promise<{ self: Peer, peers: Peer[], debug: string }>

  /**
   * Update the currently active debugging namespaces
   */
  setDebug(namespace?: string): Promise<void>

  /**
   * Open a connection to the passed peer or multiaddr
   */
  openConnection(peerIdOrMultiaddr: string, options?: OpenConnectionOptions): Promise<void>

  /**
   * Close connections open to the specified peer
   */
  closeConnection(peerId: PeerId, options?: AbortOptions): Promise<void>

  /**
   * Make content routing queries
   */
  contentRouting: ContentRouting

  /**
   * Make peer routing queries
   */
  peerRouting: PeerRouting
}

export interface DevToolsEvents {
  /**
   * Node metrics have been updated
   */
  'metrics': CustomEvent<Record<string, any>>

  /**
   * The node's status has changed - new addresses and/or protocols, etc
   */
  'self': CustomEvent<Peer>

  /**
   * The node's connected peers have changed
   */
  'peers': CustomEvent<Peer[]>
}

/**
 * RPC operations exposed by the DevTools
 */
export interface DevToolsRPC {
  safeDispatchEvent<Detail>(type: keyof DevToolsEvents, detail?: CustomEventInit<Detail>): Promise<void>
}

import type { AbortOptions } from './index.ts'
import type { PublicKey } from './keys.js'
import type { PeerId } from './peer-id.js'
import type { PeerInfo } from './peer-info.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * When a peer that is tagged with this prefix disconnects, we will attempt to
 * redial it, up to a limit.
 *
 * To allow multiple components to add/remove their own keep-alive tags without
 * accidentally overwriting those of other components, attach a unique suffix to
 * the tag, e.g. `keep-alive-circuit-relay` or `keep-alive-kad-dht`, etc.
 */
export const KEEP_ALIVE = 'keep-alive'

/**
 * A multiaddr with an optional flag that indicates if its trustworthy
 */
export interface Address {
  /**
   * Peer multiaddr
   */
  multiaddr: Multiaddr

  /**
   * Obtained from a signed peer record
   */
  isCertified: boolean
}

/**
 * Data stored in the peer store about peers
 */
export interface Peer {
  /**
   * Peer's peer-id instance
   */
  id: PeerId

  /**
   * Peer's addresses containing a list of multiaddrs and a isCertified field
   * indicating if the address was loaded from a signed peer record or not
   */
  addresses: Address[]

  /**
   * Peer's supported protocols
   */
  protocols: string[]

  /**
   * Peer's metadata map
   */
  metadata: Map<string, Uint8Array>

  /**
   * Tags a peer has
   */
  tags: Map<string, Tag>

  /**
   * The last peer record envelope received
   */
  peerRecordEnvelope?: Uint8Array
}

/**
 * Peer data used to update the peer store
 */
export interface PeerData {
  /**
   * Peer's addresses containing its multiaddrs and metadata - multiaddrs
   * passed here can be treated as certified if the `isCertifed` value is
   * set to true.
   *
   * If both addresses and multiaddrs are specified they will be merged
   * together with entries in addresses taking precedence.
   */
  addresses?: Address[]

  /**
   * Peer's multiaddrs - any multiaddrs passed here will be treated as
   * uncertified.
   *
   * If both addresses and multiaddrs are specified they will be merged
   * together with entries in addresses taking precedence.
   */
  multiaddrs?: Multiaddr[]

  /**
   * Peer's supported protocols
   */
  protocols?: string[]

  /**
   * Peer's metadata map. When merging pass undefined as values to remove metadata.
   */
  metadata?: Map<string, Uint8Array | undefined> | Record<string, Uint8Array | undefined>

  /**
   * Peer tags. When merging pass undefined as values to remove tags.
   */
  tags?: Map<string, TagOptions | undefined> | Record<string, TagOptions | undefined>

  /**
   * If this Peer has an RSA key, it's public key can be set with this property.
   *
   * The byte array should be the protobuf encoded form of the public key.
   */
  publicKey?: PublicKey

  /**
   * The last peer record envelope received
   */
  peerRecordEnvelope?: Uint8Array
}

export interface TagOptions {
  /**
   * An optional tag value (1-100)
   */
  value?: number

  /**
   * An optional duration in ms after which the tag will expire
   */
  ttl?: number
}

export interface Tag {
  /**
   * The tag value
   */
  value: number
}

/**
 * A predicate by which to filter lists of peers
 */
export interface PeerQueryFilter { (peer: Peer): boolean }

/**
 * A predicate by which to sort lists of peers
 */
export interface PeerQueryOrder { (a: Peer, b: Peer): -1 | 0 | 1 }

/**
 * A query for getting lists of peers
 */
export interface PeerQuery extends AbortOptions {
  filters?: PeerQueryFilter[]
  orders?: PeerQueryOrder[]
  limit?: number
  offset?: number
}

export interface ConsumePeerRecordOptions extends AbortOptions {
  expectedPeer?: PeerId
}

export interface PeerStore {
  /**
   * Loop over every peer - the looping is async because we read from a
   * datastore but the peer operation is sync, this is to prevent
   * long-lived peer operations causing deadlocks over the datastore
   * which can happen if they try to access the peer store during the
   * loop
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.forEach(peer => {
   *   // ...
   * })
   * ```
   */
  forEach(fn: (peer: Peer) => void, query?: PeerQuery): Promise<void>

  /**
   * Returns all peers in the peer store.
   *
   * @example
   *
   * ```TypeScript
   * for (const peer of await peerStore.all()) {
   *   // ...
   * }
   * ```
   */
  all(query?: PeerQuery): Promise<Peer[]>

  /**
   * Delete all data stored for the passed peer
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.addressBook.set(peerId, multiaddrs)
   * await peerStore.addressBook.get(peerId)
   * // multiaddrs[]
   *
   * await peerStore.delete(peerId)
   *
   * await peerStore.addressBook.get(peerId)
   * // []
   * ```
   */
  delete(peerId: PeerId, options?: AbortOptions): Promise<void>

  /**
   * Returns true if the passed PeerId is in the peer store
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.has(peerId)
   * // false
   * await peerStore.addressBook.add(peerId, multiaddrs)
   * await peerStore.has(peerId)
   * // true
   * ```
   */
  has(peerId: PeerId, options?: AbortOptions): Promise<boolean>

  /**
   * Returns all data stored for the passed PeerId
   *
   * @example
   *
   * ```TypeScript
   * const peer = await peerStore.get(peerId)
   * // { .. }
   * ```
   */
  get(peerId: PeerId, options?: AbortOptions): Promise<Peer>

  /**
   * Returns a PeerInfo object for the passed peer id. This is similar to `get`
   * except the returned value contains fewer fields and is often used to
   * exchange peer information with other systems.
   *
   * The returned object can be passed to `JSON.stringify` without any
   * additional processing.
   *
   * @see https://docs.libp2p.io/concepts/fundamentals/peers/#peer-info
   *
   * @example
   *
   * ```TypeScript
   * const peerInfo = await peerStore.getInfo(peerId)
   *
   * console.info(JSON.stringify(peerInfo))
   * // {
   * //    id: 'peerId'
   * //    multiaddrs: [
   * //      '...'
   * //    ]
   * // }
   * ```
   */
  getInfo (peerId: PeerId, options?: AbortOptions): Promise<PeerInfo>

  /**
   * Adds a peer to the peer store, overwriting any existing data
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.save(peerId, {
   *   multiaddrs
   * })
   * ```
   */
  save(id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer>

  /**
   * Adds a peer to the peer store, overwriting only the passed fields
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.patch(peerId, {
   *   multiaddrs
   * })
   * ```
   */
  patch(id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer>

  /**
   * Adds a peer to the peer store, deeply merging any existing data.
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.merge(peerId, {
   *   multiaddrs
   * })
   * ```
   */
  merge(id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer>

  /**
   * Unmarshal and verify a signed peer record, extract the multiaddrs and
   * overwrite the stored addresses for the peer.
   *
   * Optionally pass an expected PeerId to verify that the peer record was
   * signed by that peer.
   *
   * @example
   *
   * ```TypeScript
   * await peerStore.consumePeerRecord(buf, expectedPeer)
   * ```
   */
  consumePeerRecord(buf: Uint8Array, options?: ConsumePeerRecordOptions): Promise<boolean>

  /**
   * @deprecated Pass `expectedPeer` as a property of `options` instead
   */
  consumePeerRecord(buf: Uint8Array, expectedPeer?: PeerId, options?: AbortOptions): Promise<boolean>
}

import { TypedEventEmitter } from '@libp2p/interface'
import map from 'it-map'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { PeerDistanceList } from '../peer-list/peer-distance-list.js'
import { KBUCKET_SIZE } from './index.js'
import type { PeerId } from '@libp2p/interface'

function arrayEquals (array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1 === array2) {
    return true
  }
  if (array1.length !== array2.length) {
    return false
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}

function ensureInt8 (name: string, val?: Uint8Array): void {
  if (!(val instanceof Uint8Array)) {
    throw new TypeError(name + ' is not a Uint8Array')
  }

  if (val.byteLength !== 32) {
    throw new TypeError(name + ' had incorrect length')
  }
}

export interface PingEventDetails {
  oldContacts: Peer[]
  newContact: Peer
}

export interface KBucketEvents {
  'ping': CustomEvent<PingEventDetails>
  'added': CustomEvent<Peer>
  'removed': CustomEvent<Peer>
}

export interface KBucketOptions {
  /**
   * The current peer. All subsequently added peers must have a KadID that is
   * the same length as this peer.
   */
  localPeer: Peer

  /**
   * How many bits of the key to use when forming the bucket trie. The larger
   * this value, the deeper the tree will grow and the slower the lookups will
   * be but the peers returned will be more specific to the key.
   */
  prefixLength: number

  /**
   * The number of nodes that a max-depth k-bucket can contain before being
   * full.
   *
   * @default 20
   */
  kBucketSize?: number

  /**
   * The number of nodes that an intermediate k-bucket can contain before being
   * split.
   *
   * @default kBucketSize
   */
  splitThreshold?: number

  /**
   * The number of nodes to ping when a bucket that should not be split becomes
   * full. KBucket will emit a `ping` event that contains `numberOfNodesToPing`
   * nodes that have not been contacted the longest.
   */
  numberOfNodesToPing?: number
}

export interface Peer {
  kadId: Uint8Array
  peerId: PeerId
}

export interface LeafBucket {
  prefix: string
  depth: number
  peers: Peer[]
}

export interface InternalBucket {
  prefix: string
  depth: number
  left: Bucket
  right: Bucket
}

export type Bucket = LeafBucket | InternalBucket

export function isLeafBucket (obj: any): obj is LeafBucket {
  return Array.isArray(obj?.peers)
}

/**
 * Implementation of a Kademlia DHT routing table as a prefix binary trie with
 * configurable prefix length, bucket split threshold and size.
 */
export class KBucket extends TypedEventEmitter<KBucketEvents> {
  public root: Bucket
  public localPeer: Peer
  private readonly prefixLength: number
  private readonly splitThreshold: number
  private readonly kBucketSize: number
  private readonly numberOfNodesToPing: number

  constructor (options: KBucketOptions) {
    super()

    this.localPeer = options.localPeer
    this.prefixLength = options.prefixLength
    this.kBucketSize = options.kBucketSize ?? KBUCKET_SIZE
    this.splitThreshold = options.splitThreshold ?? this.kBucketSize
    this.numberOfNodesToPing = options.numberOfNodesToPing ?? 3

    ensureInt8('options.localPeer.kadId', options.localPeer.kadId)

    this.root = {
      prefix: '',
      depth: 0,
      peers: []
    }
  }

  /**
   * Adds a contact to the k-bucket.
   *
   * @param {Peer} peer - the contact object to add
   */
  add (peer: Peer): void {
    ensureInt8('peer.kadId', peer?.kadId)

    const bucket = this._determineBucket(peer.kadId)

    // check if the contact already exists
    if (this._indexOf(bucket, peer.kadId) > -1) {
      return
    }

    // are there too many peers in the bucket and can we make the trie deeper?
    if (bucket.peers.length === this.splitThreshold && bucket.depth < this.prefixLength) {
      // split the bucket
      this._split(bucket)

      // try again
      this.add(peer)

      return
    }

    // is there space in the bucket?
    if (bucket.peers.length < this.kBucketSize) {
      bucket.peers.push(peer)
      this.safeDispatchEvent('added', { detail: peer })

      return
    }

    // we are at the bottom of the trie and the bucket is full so we can't add
    // any more peers.
    //
    // instead ping the first this.numberOfNodesToPing in order to determine
    // if they are still online.
    //
    // only add the new peer if one of the pinged nodes does not respond, this
    // prevents DoS flooding with new invalid contacts.
    this.safeDispatchEvent('ping', {
      detail: {
        oldContacts: bucket.peers.slice(0, this.numberOfNodesToPing),
        newContact: peer
      }
    })
  }

  /**
   * Get 0-n closest contacts to the provided node id. "Closest" here means:
   * closest according to the XOR metric of the contact node id.
   *
   * @param {Uint8Array} id - Contact node id
   * @returns {Generator<Peer, void, undefined>} Array Maximum of n closest contacts to the node id
   */
  * closest (id: Uint8Array, n: number = this.kBucketSize): Generator<PeerId, void, undefined> {
    const list = new PeerDistanceList(id, n)

    for (const peer of this.toIterable()) {
      list.addWitKadId({ id: peer.peerId, multiaddrs: [] }, peer.kadId)
    }

    yield * map(list.peers, info => info.id)
  }

  /**
   * Counts the total number of contacts in the tree.
   *
   * @returns {number} The number of contacts held in the tree
   */
  count (): number {
    function countBucket (bucket: Bucket): number {
      if (isLeafBucket(bucket)) {
        return bucket.peers.length
      }

      let count = 0

      if (bucket.left != null) {
        count += countBucket(bucket.left)
      }

      if (bucket.right != null) {
        count += countBucket(bucket.right)
      }

      return count
    }

    return countBucket(this.root)
  }

  /**
   * Get a contact by its exact ID.
   * If this is a leaf, loop through the bucket contents and return the correct
   * contact if we have it or null if not. If this is an inner node, determine
   * which branch of the tree to traverse and repeat.
   *
   * @param {Uint8Array} kadId - The ID of the contact to fetch.
   * @returns {object | undefined} The contact if available, otherwise null
   */
  get (kadId: Uint8Array): Peer | undefined {
    const bucket = this._determineBucket(kadId)
    const index = this._indexOf(bucket, kadId)

    return bucket.peers[index]
  }

  /**
   * Removes contact with the provided id.
   *
   * @param {Uint8Array} kadId - The ID of the contact to remove
   */
  remove (kadId: Uint8Array): void {
    const bucket = this._determineBucket(kadId)
    const index = this._indexOf(bucket, kadId)

    if (index > -1) {
      const peer = bucket.peers.splice(index, 1)[0]
      this.safeDispatchEvent('removed', {
        detail: peer
      })
    }
  }

  /**
   * Similar to `toArray()` but instead of buffering everything up into an
   * array before returning it, yields contacts as they are encountered while
   * walking the tree.
   *
   * @returns {Iterable} All of the contacts in the tree, as an iterable
   */
  * toIterable (): Generator<Peer, void, undefined> {
    function * iterate (bucket: Bucket): Generator<Peer, void, undefined> {
      if (isLeafBucket(bucket)) {
        yield * bucket.peers
        return
      }

      yield * iterate(bucket.left)
      yield * iterate(bucket.right)
    }

    yield * iterate(this.root)
  }

  /**
   * Default distance function. Finds the XOR distance between firstId and
   * secondId.
   *
   * @param  {Uint8Array} firstId - Uint8Array containing first id.
   * @param  {Uint8Array} secondId - Uint8Array containing second id.
   * @returns {number} Integer The XOR distance between firstId and secondId.
   */
  distance (firstId: Uint8Array, secondId: Uint8Array): bigint {
    return BigInt('0x' + uint8ArrayToString(uint8ArrayXor(firstId, secondId), 'base16'))
  }

  /**
   * Determines whether the id at the bitIndex is 0 or 1
   * Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
   *
   * @param {Uint8Array} kadId - Id to compare localNodeId with
   * @returns {LeafBucket} left leaf if id at bitIndex is 0, right leaf otherwise.
   */
  private _determineBucket (kadId: Uint8Array): LeafBucket {
    const bitString = uint8ArrayToString(kadId, 'base2')
    const prefix = bitString.substring(0, this.prefixLength)

    function findBucket (bucket: Bucket, bitIndex: number = 0): LeafBucket {
      if (isLeafBucket(bucket)) {
        return bucket
      }

      const bit = prefix[bitIndex]

      if (bit === '0') {
        return findBucket(bucket.left, bitIndex + 1)
      }

      return findBucket(bucket.right, bitIndex + 1)
    }

    return findBucket(this.root)
  }

  /**
   * Returns the index of the contact with provided
   * id if it exists, returns -1 otherwise.
   *
   * @param {object} bucket - internal object that has 2 leafs: left and right
   * @param {Uint8Array} kadId - KadId of peer
   * @returns {number} Integer Index of contact with provided id if it exists, -1 otherwise.
   */
  private _indexOf (bucket: LeafBucket, kadId: Uint8Array): number {
    return bucket.peers.findIndex(peer => arrayEquals(peer.kadId, kadId))
  }

  /**
   * Modify the bucket, turn it from a leaf bucket to an internal bucket
   *
   * @param {any} bucket - bucket for splitting
   */
  private _split (bucket: LeafBucket): void {
    const depth = bucket.depth + 1

    // create child buckets
    const left: LeafBucket = {
      prefix: '0',
      depth,
      peers: []
    }
    const right: LeafBucket = {
      prefix: '1',
      depth,
      peers: []
    }

    // redistribute peers
    for (const peer of bucket.peers) {
      const bitString = uint8ArrayToString(peer.kadId, 'base2')

      if (bitString[depth] === '0') {
        left.peers.push(peer)
      } else {
        right.peers.push(peer)
      }
    }

    // convert leaf bucket to internal bucket
    // @ts-expect-error peers is not a property of LeafBucket
    delete bucket.peers
    // @ts-expect-error left is not a property of LeafBucket
    bucket.left = left
    // @ts-expect-error right is not a property of LeafBucket
    bucket.right = right
  }
}

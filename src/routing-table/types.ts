import type PeerId from 'peer-id'

export interface KBucketPeer {
  id: Uint8Array
  peer: PeerId
}

export interface KBucket {
  id: Uint8Array
  contacts: KBucketPeer[]
  dontSplit: boolean
  left: KBucket
  right: KBucket
}

export interface KBucketTree {
  root: KBucket
  localNodeId: Uint8Array
  on: (event: 'ping', callback: (oldContacts: KBucketPeer[], newContact: KBucketPeer) => void) => void
  closest: (key: Uint8Array, count: number) => KBucketPeer[]
  closestPeer: (key: Uint8Array) => KBucketPeer
  remove: (key: Uint8Array) => void
  add: (peer: KBucketPeer) => void
  count: () => number
  toIterable: () => Iterable<KBucket>
}

import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { PartsMetadataMerger, PeerIdStr } from '../types.js'

interface GroupState {
  /** The group's identifier, kept so gossip does not have to re-parse the key */
  groupID: Uint8Array
  /** Combined local metadata (merged from all received metadata) */
  localMetadata: Uint8Array
  /** Per-peer metadata tracking what each peer has reported */
  peerMetadata: Map<PeerIdStr, Uint8Array>
  /**
   * Timestamp when this group was first seen.
   *
   * Note this is deliberately distinct from `lastAccessedAt`: TTL pruning ages
   * a group from creation, so a group cannot be kept alive indefinitely by
   * traffic, while capacity eviction uses recency so active groups survive.
   */
  createdAt: number
  /** Timestamp of last access (for LRU eviction) */
  lastAccessedAt: number
}

/** A group's identifier paired with the metadata to gossip for it */
export interface GroupGossip {
  groupID: Uint8Array
  metadata: Uint8Array
}

/**
 * Tracks partial message state for a single topic.
 * Maintains per-group state with LRU eviction and TTL-based pruning.
 */
export class PartialMessageState {
  private readonly groups = new Map<string, GroupState>()
  private readonly maxGroups: number
  private readonly groupTTLMs: number
  private readonly merger: PartsMetadataMerger

  constructor (merger: PartsMetadataMerger, maxGroups: number, groupTTLMs: number) {
    this.merger = merger
    this.maxGroups = maxGroups
    this.groupTTLMs = groupTTLMs
  }

  /**
   * Convert a groupID Uint8Array to a string key for the map
   */
  private groupKey (groupID: Uint8Array): string {
    return uint8ArrayToString(groupID, 'base16')
  }

  /**
   * Update state with received metadata for a group from a peer.
   * Merges the metadata into the local combined metadata.
   */
  updateMetadata (groupID: Uint8Array, peerId: PeerIdStr, metadata: Uint8Array): void {
    const key = this.groupKey(groupID)
    const now = Date.now()

    let group = this.groups.get(key)
    if (group == null) {
      // Evict oldest if at capacity
      if (this.groups.size >= this.maxGroups) {
        this.evictOldest()
      }
      group = {
        groupID,
        localMetadata: new Uint8Array(metadata.length),
        peerMetadata: new Map(),
        createdAt: now,
        lastAccessedAt: now
      }
      this.groups.set(key, group)
    }

    group.lastAccessedAt = now
    group.peerMetadata.set(peerId, metadata)
    group.localMetadata = this.merger.merge(group.localMetadata, metadata)
  }

  /**
   * Get the combined local metadata for a group.
   */
  getLocalMetadata (groupID: Uint8Array): Uint8Array | undefined {
    const key = this.groupKey(groupID)
    const group = this.groups.get(key)
    if (group != null) {
      group.lastAccessedAt = Date.now()
    }
    return group?.localMetadata
  }

  /**
   * Get the metadata a specific peer has reported for a group.
   */
  getPeerMetadata (groupID: Uint8Array, peerId: PeerIdStr): Uint8Array | undefined {
    const key = this.groupKey(groupID)
    return this.groups.get(key)?.peerMetadata.get(peerId)
  }

  /**
   * Get all groups that have metadata, for gossip during heartbeat.
   *
   * Returns the groupID as bytes rather than as the internal hex key, so the
   * caller does not have to parse it back.
   */
  getGroupsForGossip (): GroupGossip[] {
    const result: GroupGossip[] = []
    for (const group of this.groups.values()) {
      if (group.localMetadata.length > 0) {
        result.push({ groupID: group.groupID, metadata: group.localMetadata })
      }
    }
    return result
  }

  /**
   * Check if we have any state for a group.
   */
  hasGroup (groupID: Uint8Array): boolean {
    return this.groups.has(this.groupKey(groupID))
  }

  /**
   * Remove all entries for a peer across all groups.
   *
   * Groups left with no peer metadata and nothing merged locally are dropped
   * too, so a churn of peers cannot accumulate empty group shells.
   */
  removePeer (peerId: PeerIdStr): void {
    for (const [key, group] of this.groups) {
      group.peerMetadata.delete(peerId)

      if (group.peerMetadata.size === 0 && group.localMetadata.length === 0) {
        this.groups.delete(key)
      }
    }
  }

  /**
   * Prune groups older than the TTL.
   */
  pruneExpired (): number {
    const now = Date.now()
    let pruned = 0
    for (const [key, group] of this.groups) {
      if (now - group.createdAt > this.groupTTLMs) {
        this.groups.delete(key)
        pruned++
      }
    }
    return pruned
  }

  /**
   * Evict the least recently accessed group.
   */
  private evictOldest (): void {
    let oldestKey: string | undefined
    let oldestTime = Infinity

    for (const [key, group] of this.groups) {
      if (group.lastAccessedAt < oldestTime) {
        oldestTime = group.lastAccessedAt
        oldestKey = key
      }
    }

    if (oldestKey != null) {
      this.groups.delete(oldestKey)
    }
  }

  /**
   * Get the number of tracked groups.
   */
  get size (): number {
    return this.groups.size
  }

  /**
   * Clear all state.
   */
  clear (): void {
    this.groups.clear()
  }
}

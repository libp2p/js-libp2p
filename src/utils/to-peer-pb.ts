import type { PeerId } from '@libp2p/interface-peer-id'
import type { Address, Peer, PeerData, TagOptions } from '@libp2p/interface-peer-store'
import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from '../errors.js'
import { equals as uint8arrayEquals } from 'uint8arrays/equals'
import type { AddressFilter } from '../index.js'
import type { Tag, Peer as PeerPB } from '../pb/peer.js'
import { dedupeFilterAndSortAddresses } from './dedupe-addresses.js'

export interface ToPBPeerOptions {
  addressFilter?: AddressFilter
  existingPeer?: Peer
}

export async function toPeerPB (peerId: PeerId, data: Partial<PeerData>, strategy: 'merge' | 'patch', options: ToPBPeerOptions): Promise<PeerPB> {
  if (data == null) {
    throw new CodeError('Invalid PeerData', codes.ERR_INVALID_PARAMETERS)
  }

  if (data.publicKey != null && peerId.publicKey != null && !uint8arrayEquals(data.publicKey, peerId.publicKey)) {
    throw new CodeError('publicKey bytes do not match peer id publicKey bytes', codes.ERR_INVALID_PARAMETERS)
  }

  const existingPeer = options.existingPeer

  if (existingPeer != null && !peerId.equals(existingPeer.id)) {
    throw new CodeError('peer id did not match existing peer id', codes.ERR_INVALID_PARAMETERS)
  }

  let addresses: Address[] = existingPeer?.addresses ?? []
  let protocols: Set<string> = new Set(existingPeer?.protocols ?? [])
  let metadata: Map<string, Uint8Array> = existingPeer?.metadata ?? new Map()
  let tags: Map<string, Tag> = existingPeer?.tags ?? new Map()
  let peerRecordEnvelope: Uint8Array | undefined = existingPeer?.peerRecordEnvelope

  // when patching, we replace the original fields with passed values
  if (strategy === 'patch') {
    if (data.multiaddrs != null || data.addresses != null) {
      addresses = []

      if (data.multiaddrs != null) {
        addresses.push(...data.multiaddrs.map(multiaddr => ({
          isCertified: false,
          multiaddr
        })))
      }

      if (data.addresses != null) {
        addresses.push(...data.addresses)
      }
    }

    if (data.protocols != null) {
      protocols = new Set(data.protocols)
    }

    if (data.metadata != null) {
      const metadataEntries = data.metadata instanceof Map ? [...data.metadata.entries()] : Object.entries(data.metadata)

      metadata = createSortedMap(metadataEntries, {
        validate: validateMetadata
      })
    }

    if (data.tags != null) {
      const tagsEntries = data.tags instanceof Map ? [...data.tags.entries()] : Object.entries(data.tags)

      tags = createSortedMap(tagsEntries, {
        validate: validateTag,
        map: mapTag
      })
    }

    if (data.peerRecordEnvelope != null) {
      peerRecordEnvelope = data.peerRecordEnvelope
    }
  }

  // when merging, we join the original fields with passed values
  if (strategy === 'merge') {
    if (data.multiaddrs != null) {
      addresses.push(...data.multiaddrs.map(multiaddr => ({
        isCertified: false,
        multiaddr
      })))
    }

    if (data.addresses != null) {
      addresses.push(...data.addresses)
    }

    if (data.protocols != null) {
      protocols = new Set([...protocols, ...data.protocols])
    }

    if (data.metadata != null) {
      const metadataEntries = data.metadata instanceof Map ? [...data.metadata.entries()] : Object.entries(data.metadata)

      for (const [key, value] of metadataEntries) {
        if (value == null) {
          metadata.delete(key)
        } else {
          metadata.set(key, value)
        }
      }

      metadata = createSortedMap([...metadata.entries()], {
        validate: validateMetadata
      })
    }

    if (data.tags != null) {
      const tagsEntries = data.tags instanceof Map ? [...data.tags.entries()] : Object.entries(data.tags)
      const mergedTags: Map<string, Tag | TagOptions> = new Map(tags)

      for (const [key, value] of tagsEntries) {
        if (value == null) {
          mergedTags.delete(key)
        } else {
          mergedTags.set(key, value)
        }
      }

      tags = createSortedMap([...mergedTags.entries()], {
        validate: validateTag,
        map: mapTag
      })
    }

    if (data.peerRecordEnvelope != null) {
      peerRecordEnvelope = data.peerRecordEnvelope
    }
  }

  const output: PeerPB = {
    addresses: await dedupeFilterAndSortAddresses(peerId, options.addressFilter ?? (async () => true), addresses),
    protocols: [...protocols.values()].sort((a, b) => {
      return a.localeCompare(b)
    }),
    metadata,
    tags,

    publicKey: existingPeer?.id.publicKey ?? data.publicKey ?? peerId.publicKey,
    peerRecordEnvelope
  }

  // Ed25519 and secp256k1 have their public key embedded in them so no need to duplicate it
  if (peerId.type !== 'RSA') {
    delete output.publicKey
  }

  return output
}

interface CreateSortedMapOptions <V, R = V> {
  validate: (key: string, value: V) => void
  map?: (key: string, value: V) => R
}

/**
 * In JS maps are ordered by insertion order so create a new map with the
 * keys inserted in alphabetical order.
 */
function createSortedMap <V, R = V> (entries: Array<[string, V | undefined]>, options: CreateSortedMapOptions<V, R>): Map<string, R> {
  const output = new Map()

  for (const [key, value] of entries) {
    if (value == null) {
      continue
    }

    options.validate(key, value)
  }

  for (const [key, value] of entries.sort(([a], [b]) => {
    return a.localeCompare(b)
  })) {
    if (value != null) {
      output.set(key, options.map?.(key, value) ?? value)
    }
  }

  return output
}

function validateMetadata (key: string, value: Uint8Array): void {
  if (typeof key !== 'string') {
    throw new CodeError('Metadata key must be a string', codes.ERR_INVALID_PARAMETERS)
  }

  if (!(value instanceof Uint8Array)) {
    throw new CodeError('Metadata value must be a Uint8Array', codes.ERR_INVALID_PARAMETERS)
  }
}

function validateTag (key: string, tag: TagOptions): void {
  if (typeof key !== 'string') {
    throw new CodeError('Tag name must be a string', codes.ERR_INVALID_PARAMETERS)
  }

  if (tag.value != null) {
    if (parseInt(`${tag.value}`, 10) !== tag.value) {
      throw new CodeError('Tag value must be an integer', codes.ERR_INVALID_PARAMETERS)
    }

    if (tag.value < 0 || tag.value > 100) {
      throw new CodeError('Tag value must be between 0-100', codes.ERR_INVALID_PARAMETERS)
    }
  }

  if (tag.ttl != null) {
    if (parseInt(`${tag.ttl}`, 10) !== tag.ttl) {
      throw new CodeError('Tag ttl must be an integer', codes.ERR_INVALID_PARAMETERS)
    }

    if (tag.ttl < 0) {
      throw new CodeError('Tag ttl must be between greater than 0', codes.ERR_INVALID_PARAMETERS)
    }
  }
}

function mapTag (key: string, tag: any): Tag {
  let expiry: bigint | undefined

  if (tag.expiry != null) {
    expiry = tag.expiry
  }

  if (tag.ttl != null) {
    expiry = BigInt(Date.now() + Number(tag.ttl))
  }

  return {
    value: tag.value ?? 0,
    expiry
  }
}

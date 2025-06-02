/* eslint-disable complexity */
import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidParametersError } from '@libp2p/interface'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { dedupeFilterAndSortAddresses } from './dedupe-addresses.js'
import type { AddressFilter } from '../index.js'
import type { Tag, Peer as PeerPB } from '../pb/peer.js'
import type { ExistingPeer } from '../store.js'
import type { PeerId, Address, PeerData, TagOptions } from '@libp2p/interface'
import type { AbortOptions } from '@multiformats/multiaddr'

export interface ToPBPeerOptions extends AbortOptions {
  addressFilter?: AddressFilter
  existingPeer?: ExistingPeer
}

export async function toPeerPB (peerId: PeerId, data: Partial<PeerData>, strategy: 'merge' | 'patch', options: ToPBPeerOptions): Promise<PeerPB> {
  if (data == null) {
    throw new InvalidParametersError('Invalid PeerData')
  }

  if (data.publicKey != null && peerId.publicKey != null && !data.publicKey.equals(peerId.publicKey)) {
    throw new InvalidParametersError('publicKey bytes do not match peer id publicKey bytes')
  }

  const existingPeer = options.existingPeer?.peer

  if (existingPeer != null && !peerId.equals(existingPeer.id)) {
    throw new InvalidParametersError('peer id did not match existing peer id')
  }

  let addresses: Address[] = existingPeer?.addresses ?? []
  let protocols = new Set<string>(existingPeer?.protocols ?? [])
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
      const mergedTags = new Map<string, Tag | TagOptions>(tags)

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

  let publicKey: Uint8Array | undefined

  if (existingPeer?.id.publicKey != null) {
    publicKey = publicKeyToProtobuf(existingPeer.id.publicKey)
  } else if (data.publicKey != null) {
    publicKey = publicKeyToProtobuf(data.publicKey)
  } else if (peerId.publicKey != null) {
    publicKey = publicKeyToProtobuf(peerId.publicKey)
  }

  const output: PeerPB = {
    addresses: await dedupeFilterAndSortAddresses(
      peerId,
      options.addressFilter ?? (async () => true),
      addresses,
      options.existingPeer?.peerPB.addresses,
      options
    ),
    protocols: [...protocols.values()].sort((a, b) => {
      return a.localeCompare(b)
    }),
    metadata,
    tags,
    publicKey,
    peerRecordEnvelope
  }

  // add observed addresses to multiaddrs
  output.addresses.forEach(addr => {
    addr.observed = options.existingPeer?.peerPB.addresses?.find(addr => uint8ArrayEquals(addr.multiaddr, addr.multiaddr))?.observed ?? Date.now()
  })

  // Ed25519 and secp256k1 have their public key embedded in them so no need to duplicate it
  if (peerId.type !== 'RSA') {
    delete output.publicKey
  }

  return output
}

interface CreateSortedMapOptions <V, R = V> {
  validate(key: string, value: V): void
  map?(key: string, value: V): R
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
    throw new InvalidParametersError('Metadata key must be a string')
  }

  if (!(value instanceof Uint8Array)) {
    throw new InvalidParametersError('Metadata value must be a Uint8Array')
  }
}

function validateTag (key: string, tag: TagOptions): void {
  if (typeof key !== 'string') {
    throw new InvalidParametersError('Tag name must be a string')
  }

  if (tag.value != null) {
    if (parseInt(`${tag.value}`, 10) !== tag.value) {
      throw new InvalidParametersError('Tag value must be an integer')
    }

    if (tag.value < 0 || tag.value > 100) {
      throw new InvalidParametersError('Tag value must be between 0-100')
    }
  }

  if (tag.ttl != null) {
    if (parseInt(`${tag.ttl}`, 10) !== tag.ttl) {
      throw new InvalidParametersError('Tag ttl must be an integer')
    }

    if (tag.ttl < 0) {
      throw new InvalidParametersError('Tag ttl must be between greater than 0')
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

  const output: Tag = {
    value: tag.value ?? 0
  }

  if (expiry != null) {
    output.expiry = expiry
  }

  return output
}

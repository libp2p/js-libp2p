import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidParametersError } from '@libp2p/interface'
import { isMultiaddr } from '@multiformats/multiaddr'
import type { Peer as PeerPB } from '../pb/peer.js'
import type { PeerId, PeerData } from '@libp2p/interface'

export function toDatastorePeer (peerId: PeerId, data: PeerData): PeerPB {
  if (data == null) {
    throw new InvalidParametersError('Invalid PeerData')
  }

  if (data.publicKey != null && peerId.publicKey != null && !data.publicKey.equals(peerId.publicKey)) {
    throw new InvalidParametersError('publicKey bytes do not match peer id publicKey bytes')
  }

  // merge addresses and multiaddrs, and dedupe
  const addressSet = new Set()

  const output: PeerPB = {
    addresses: (data.addresses ?? [])
      .concat((data.multiaddrs ?? []).map(multiaddr => ({ multiaddr, isCertified: false })))
      .filter(address => {
        if (!isMultiaddr(address.multiaddr)) {
          throw new InvalidParametersError('Invalid mulitaddr')
        }

        if (addressSet.has(address.multiaddr.toString())) {
          return false
        }

        addressSet.add(address.multiaddr.toString())
        return true
      })
      .sort((a, b) => {
        return a.multiaddr.toString().localeCompare(b.multiaddr.toString())
      })
      .map(({ multiaddr, isCertified }) => ({
        multiaddr: multiaddr.bytes,
        isCertified
      })),
    protocols: (data.protocols ?? []).sort(),
    metadata: new Map(),
    tags: new Map(),
    publicKey: data.publicKey != null ? publicKeyToProtobuf(data.publicKey) : undefined,
    peerRecordEnvelope: data.peerRecordEnvelope
  }

  // remove invalid metadata
  if (data.metadata != null) {
    const metadataEntries = data.metadata instanceof Map ? data.metadata.entries() : Object.entries(data.metadata)

    for (const [key, value] of metadataEntries) {
      if (typeof key !== 'string') {
        throw new InvalidParametersError('Peer metadata keys must be strings')
      }

      if (value == null) {
        continue
      }

      if (!(value instanceof Uint8Array)) {
        throw new InvalidParametersError('Peer metadata values must be Uint8Arrays')
      }

      output.metadata.set(key, value)
    }
  }

  if (data.tags != null) {
    const tagsEntries = data.tags instanceof Map ? data.tags.entries() : Object.entries(data.tags)

    for (const [key, value] of tagsEntries) {
      if (typeof key !== 'string') {
        throw new InvalidParametersError('Peer tag keys must be strings')
      }

      if (value == null) {
        continue
      }

      const tag = {
        name: key,
        ttl: value.ttl,
        value: value.value ?? 0
      }

      if (tag.value < 0 || tag.value > 100) {
        throw new InvalidParametersError('Tag value must be between 0-100')
      }

      if (parseInt(`${tag.value}`, 10) !== tag.value) {
        throw new InvalidParametersError('Tag value must be an integer')
      }

      if (tag.ttl != null) {
        if (tag.ttl < 0) {
          throw new InvalidParametersError('Tag ttl must be between greater than 0')
        }

        if (parseInt(`${tag.ttl}`, 10) !== tag.ttl) {
          throw new InvalidParametersError('Tag ttl must be an integer')
        }
      }

      output.tags.set(tag.name, {
        value: tag.value,
        expiry: tag.ttl == null ? undefined : BigInt(Date.now() + tag.ttl)
      })
    }
  }

  return output
}

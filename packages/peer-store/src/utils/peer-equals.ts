import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import type { Peer, Address, Tag } from '../pb/peer.js'

export function peerEquals (peerA: Peer, peerB: Peer): boolean {
  return addressesEqual(peerA.addresses, peerB.addresses) &&
    protocolsEqual(peerA.protocols, peerB.protocols) &&
    publicKeyEqual(peerA.publicKey, peerB.publicKey) &&
    peerRecordEnvelope(peerA.peerRecordEnvelope, peerB.peerRecordEnvelope) &&
    metadataEqual(peerA.metadata, peerB.metadata) &&
    tagsEqual(peerA.tags, peerB.tags)
}

function addressesEqual (addressesA: Address[], addressesB: Address[]): boolean {
  return compareArrays(addressesA, addressesB, (a, b) => {
    if (a.isCertified !== b.isCertified) {
      return false
    }

    if (!uint8ArrayEquals(a.multiaddr, b.multiaddr)) {
      return false
    }

    return true
  })
}

function protocolsEqual (protocolsA: string[], protocolsB: string[]): boolean {
  return compareArrays(protocolsA, protocolsB, (a, b) => a === b)
}

function publicKeyEqual (publicKeyA?: Uint8Array, publicKeyB?: Uint8Array): boolean {
  return compareOptionalUint8Arrays(publicKeyA, publicKeyB)
}

function peerRecordEnvelope (envelopeA?: Uint8Array, envelopeB?: Uint8Array): boolean {
  return compareOptionalUint8Arrays(envelopeA, envelopeB)
}

function metadataEqual (metadataA: Map<string, Uint8Array>, metadataB: Map<string, Uint8Array>): boolean {
  return compareMaps(metadataA, metadataB, (a, b) => uint8ArrayEquals(a, b))
}

function tagsEqual (metadataA: Map<string, Tag>, metadataB: Map<string, Tag>): boolean {
  return compareMaps(metadataA, metadataB, (a, b) => a.value === b.value && a.expiry === b.expiry)
}

function compareOptionalUint8Arrays (arrA?: Uint8Array, arrB?: Uint8Array): boolean {
  if (arrA == null && arrB == null) {
    return true
  }

  if (arrA != null && arrB != null) {
    return uint8ArrayEquals(arrA, arrB)
  }

  return false
}

function compareArrays <T> (arrA: T[], arrB: T[], compare: (a: T, b: T) => boolean): boolean {
  if (arrA.length !== arrB.length) {
    return false
  }

  for (let i = 0; i < arrA.length; i++) {
    if (!compare(arrA[i], arrB[i])) {
      return false
    }
  }

  return true
}

function compareMaps <K, V> (mapA: Map<K, V>, mapB: Map<K, V>, compare: (a: V, b: V) => boolean): boolean {
  if (mapA.size !== mapB.size) {
    return false
  }

  for (const [key, value] of mapA.entries()) {
    const valueB = mapB.get(key)

    if (valueB == null) {
      return false
    }

    if (!compare(value, valueB)) {
      return false
    }
  }

  return true
}

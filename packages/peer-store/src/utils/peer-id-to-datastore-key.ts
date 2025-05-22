import { InvalidParametersError, isPeerId } from '@libp2p/interface'
import { Key } from 'interface-datastore/key'
import type { PeerId } from '@libp2p/interface'

export const NAMESPACE_COMMON = '/peers/'

export function peerIdToDatastoreKey (peerId: PeerId): Key {
  if (!isPeerId(peerId) || peerId.type == null) {
    throw new InvalidParametersError('Invalid PeerId')
  }

  const b32key = peerId.toCID().toString()
  return new Key(`${NAMESPACE_COMMON}${b32key}`)
}

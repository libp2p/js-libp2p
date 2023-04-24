import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from '../errors.js'
import { Key } from 'interface-datastore/key'
import { isPeerId, PeerId } from '@libp2p/interface-peer-id'

export const NAMESPACE_COMMON = '/peers/'

export function peerIdToDatastoreKey (peerId: PeerId): Key {
  if (!isPeerId(peerId) || peerId.type == null) {
    throw new CodeError('Invalid PeerId', codes.ERR_INVALID_PARAMETERS)
  }

  const b32key = peerId.toCID().toString()
  return new Key(`${NAMESPACE_COMMON}${b32key}`)
}

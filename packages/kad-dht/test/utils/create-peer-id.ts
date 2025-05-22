import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import type { PeerId, PrivateKey } from '@libp2p/interface'

export interface PeerAndKey {
  peerId: PeerId
  privateKey: PrivateKey
}

/**
 * Creates multiple PeerIds with private keys
 */
export async function createPeerIdsWithPrivateKey (length: number): Promise<PeerAndKey[]> {
  return Promise.all(
    new Array(length).fill(0).map(async () => createPeerIdWithPrivateKey())
  )
}

/**
 * Creates a PeerId with a private key
 */
export async function createPeerIdWithPrivateKey (): Promise<PeerAndKey> {
  const privateKey = await generateKeyPair('Ed25519')
  const peerId = peerIdFromPrivateKey(privateKey)

  return {
    peerId,
    privateKey
  }
}

import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import type { PeerId, PrivateKey } from '@libp2p/interface'

/**
 * Creates multiple PeerIds
 */
export async function createPeerIds (length: number): Promise<PeerId[]> {
  return Promise.all(
    new Array(length).fill(0).map(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      return peerIdFromPrivateKey(privateKey)
    })
  )
}

/**
 * Creates a PeerId
 */
export async function createPeerId (): Promise<PeerId> {
  const ids = await createPeerIds(1)

  return ids[0]
}

export type PeerIdWithPrivateKey = PeerId & {
  privateKey: PrivateKey
}

/**
 * Creates multiple PeerIds with private keys
 */
export async function createPeerIdsWithPrivateKey (length: number): Promise<PeerIdWithPrivateKey[]> {
  return Promise.all(
    new Array(length).fill(0).map(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey) as unknown as PeerIdWithPrivateKey
      peerId.privateKey = privateKey

      return peerId
    })
  )
}

/**
 * Creates a PeerId with a private key
 */
export async function createPeerIdWithPrivateKey (): Promise<PeerIdWithPrivateKey> {
  const ids = await createPeerIdsWithPrivateKey(1)

  return ids[0]
}

import { generateKeyPair } from '@libp2p/crypto/keys'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import type { PeerId, PrivateKey } from '@libp2p/interface'

export type PeerIdWithPrivateKey = PeerId & {
  privateKey: PrivateKey
}

/**
 * Creates multiple PeerIds
 */
export async function createPeerIds (length: number): Promise<PeerIdWithPrivateKey[]> {
  return Promise.all(
    new Array(length).fill(0).map(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = await createFromPrivKey(privateKey) as unknown as PeerIdWithPrivateKey
      peerId.privateKey = privateKey

      return peerId
    })
  )
}

/**
 * Creates a PeerId
 */
export async function createPeerId (): Promise<PeerIdWithPrivateKey> {
  const ids = await createPeerIds(1)

  return ids[0]
}

import { createEd25519PeerId } from '@libp2p/peer-id-factory'

/**
 * Creates multiple PeerIds
 */
export async function createPeerIds (length: number) {
  return await Promise.all(
    new Array(length).fill(0).map(async () => await createEd25519PeerId())
  )
}

/**
 * Creates a PeerId
 */
export async function createPeerId () {
  const ids = await createPeerIds(1)

  return ids[0]
}

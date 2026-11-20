import { generateKeyPair } from '@libp2p/crypto'
import type { PrivateKey } from '@libp2p/interface'

export async function generateEd25519Keys (): Promise<PrivateKey> {
  return generateKeyPair('Ed25519')
}

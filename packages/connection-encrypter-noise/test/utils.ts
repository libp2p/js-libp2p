import { keys } from '@libp2p/crypto'
import type { PrivateKey } from '@libp2p/interface'

export async function generateEd25519Keys (): Promise<PrivateKey> {
  return keys.generateKeyPair('Ed25519', 32)
}

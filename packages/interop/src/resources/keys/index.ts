import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NodeType, PeerIdType } from '../../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type KeyCollection = Record<PeerIdType, string>

const goKeys: KeyCollection = {
  ed25519: path.join(__dirname, 'go.ed25519.key'),
  rsa: path.join(__dirname, 'go.rsa.key'),
  secp256k1: path.join(__dirname, 'go.secp256k1.key')
}

const jsKeys: KeyCollection = {
  ed25519: path.join(__dirname, 'js.ed25519.key'),
  rsa: path.join(__dirname, 'js.rsa.key'),
  secp256k1: path.join(__dirname, 'js.secp256k1.key')
}

export const keys: Record<NodeType, KeyCollection> = {
  go: goKeys,
  js: jsKeys
}

import { keys } from '../resources/keys/index.js'
import type { DaemonFactory, Encryption, Muxer, NodeType, PeerIdType, SpawnOptions } from '../index.js'

export interface TestFunction {
  (name: string, factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void
}

export function runTests (name: string, fn: TestFunction, factory: DaemonFactory): void {
  const keyTypes: PeerIdType[] = ['ed25519', 'rsa', 'secp256k1']
  const impls: NodeType[] = ['js', 'go']
  const encrypters: Encryption[] = ['noise', 'tls', 'plaintext']
  const muxers: Muxer[] = ['mplex', 'yamux']

  for (const keyType of keyTypes) {
    for (const implA of impls) {
      for (const implB of impls) {
        for (const encrypter of encrypters) {
          // eslint-disable-next-line max-depth
          for (const muxer of muxers) {
            fn(
              `${keyType}/${encrypter}/${muxer} ${name}`,
              factory,
              { type: implA, encryption: encrypter, key: keys.go[keyType] },
              { type: implB, encryption: encrypter, key: keys.js[keyType] }
            )
          }
        }
      }
    }
  }
}

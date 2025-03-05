import { generateKeyPair } from '@libp2p/crypto/keys'
import { keychain } from '@libp2p/keychain'
import { defaultLogger } from '@libp2p/logger'
import { Key } from 'interface-datastore'
import type { PrivateKey, KeyType } from '@libp2p/interface'
import type { KeychainInit } from '@libp2p/keychain'
import type { Datastore } from 'interface-datastore'

export interface LoadOrCreateSelfKeyOptions extends KeychainInit {
  /**
   * If no private key is found in the datastore, create one with this type
   *
   * @default 'Ed25519'
   */
  keyType?: KeyType
}

export async function loadOrCreateSelfKey (datastore: Datastore, init: LoadOrCreateSelfKeyOptions = {}): Promise<PrivateKey> {
  const selfKey = init.selfKey ?? 'self'
  const chain = keychain(init)({
    datastore,
    logger: defaultLogger()
  })

  let privateKey

  if (await datastore.has(new Key(`/pkcs8/${selfKey}`))) {
    privateKey = await chain.exportKey(selfKey)
  } else {
    privateKey = await generateKeyPair(init.keyType ?? 'Ed25519')

    // persist the peer id in the keychain for next time
    await chain.importKey(selfKey, privateKey)
  }

  return privateKey
}

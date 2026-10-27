import { defaultCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { keychain } from '@libp2p/keychain'
import { Key } from 'interface-datastore'
import type { CryptoLoader, KeyType, PrivateKey } from '@libp2p/interface'
import type { KeychainInit } from '@libp2p/keychain'
import type { Datastore } from 'interface-datastore'

export interface LoadOrCreateSelfKeyOptions extends KeychainInit {
  /**
   * If no private key is found in the datastore, create one with this type
   *
   * @default 'Ed25519'
   */
  keyType?: KeyType

  /**
   * Resolves key types, pass `libp2p.getCrypto` or a loader with extra cryptos
   */
  getCrypto?: CryptoLoader
}

export async function loadOrCreateSelfKey (datastore: Datastore, init: LoadOrCreateSelfKeyOptions = {}): Promise<PrivateKey> {
  const selfKey = init.selfKey ?? 'self'
  const getCrypto = init.getCrypto ?? defaultCryptoLoader()
  const chain = keychain(init)({ datastore, getCrypto })

  if (await datastore.has(new Key(`/pkcs8/${selfKey}`))) {
    return chain.exportKey(selfKey)
  }

  const privateKey = await generateKeyPair(init.keyType ?? 'Ed25519', { getCrypto })

  // persist the peer id in the keychain for next time
  await chain.importKey(selfKey, privateKey)

  return privateKey
}

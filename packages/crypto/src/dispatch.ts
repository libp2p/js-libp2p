import { InvalidPrivateKeyError, InvalidPublicKeyError } from '@libp2p/interface'
import { rethrowAs } from './errors.ts'
import { defaultCryptoLoader } from './loader.ts'
import { PrivateKeyMessage, PublicKeyMessage } from './pb.ts'
import type { AbortOptions, CryptoLoader, PrivateKey, PublicKey } from '@libp2p/interface'

export interface CryptoLoaderOptions extends AbortOptions {
  /**
   * Resolves key types to implementations
   *
   * @default the Ed25519, RSA and ECDSA cryptos
   */
  getCrypto?: CryptoLoader
}

function keyType (decode: () => { Type?: number }, ErrorClass: typeof InvalidPublicKeyError): number {
  let type: number | undefined

  try {
    type = decode().Type
  } catch (err: any) {
    throw new ErrorClass(`Could not decode key - ${err.message}`)
  }

  if (type == null) {
    throw new ErrorClass('Key protobuf is missing a key type')
  }

  return type
}

export async function publicKeyFromProtobuf (buf: Uint8Array, options: CryptoLoaderOptions = {}): Promise<PublicKey> {
  const type = keyType(() => PublicKeyMessage.decode(buf), InvalidPublicKeyError)
  const crypto = await (options.getCrypto ?? defaultCryptoLoader())(type, options)

  return rethrowAs(InvalidPublicKeyError, () => crypto.publicKeyFromProtobuf(buf, options))
}

export async function privateKeyFromProtobuf (buf: Uint8Array, options: CryptoLoaderOptions = {}): Promise<PrivateKey> {
  const type = keyType(() => PrivateKeyMessage.decode(buf), InvalidPrivateKeyError)
  const crypto = await (options.getCrypto ?? defaultCryptoLoader())(type, options)

  return rethrowAs(InvalidPrivateKeyError, () => crypto.privateKeyFromProtobuf(buf, options))
}

export async function generateKeyPair (type: string, options: CryptoLoaderOptions & Record<string, any> = {}): Promise<PrivateKey> {
  const crypto = await (options.getCrypto ?? defaultCryptoLoader())(type, options)

  return crypto.generatePrivateKey(options)
}

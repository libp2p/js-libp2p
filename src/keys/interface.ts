
export interface JWKKeyPair {
  privateKey: JsonWebKey
  publicKey: JsonWebKey
}

export interface Uint8ArrayKeyPair {
  privateKey: Uint8Array
  publicKey: Uint8Array
}

export interface ECDHKeyPair {
  private: Uint8Array
  public: Uint8Array
}

export interface ECDHKey {
  key: Uint8Array
  genSharedKey: (theirPub: Uint8Array, forcePrivate?: ECDHKeyPair) => Promise<Uint8Array>
}

export interface JWKEncodedPublicKey { kty: string, crv: 'P-256' | 'P-384' | 'P-521', x: string, y: string, ext: boolean }

export interface JWKEncodedPrivateKey extends JWKEncodedPublicKey { d: string}

export interface EnhancedKey {
  iv: Uint8Array
  cipherKey: Uint8Array
  macKey: Uint8Array
}

export interface EnhancedKeyPair {
  k1: EnhancedKey
  k2: EnhancedKey
}

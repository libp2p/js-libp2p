
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


export interface CreateOptions {
  algorithm?: string
  nonceLength?: number
  keyLength?: number
  digest?: string
  saltLength?: number
  iterations?: number
  algorithmTagLength?: number
}

export interface AESCipher {
  encrypt: (data: Uint8Array, password: string | Uint8Array) => Promise<Uint8Array>
  decrypt: (data: Uint8Array, password: string | Uint8Array) => Promise<Uint8Array>
}

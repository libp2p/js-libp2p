import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import { InvalidCryptoExchangeError } from './errors.js'
import { Nonce } from './nonce.js'
import type { ICipherState, ISymmetricState, IHandshakeState, KeyPair, ICrypto } from './types.js'

// Code in this file is a direct translation of a subset of the noise protocol https://noiseprotocol.org/noise.html,
// agnostic to libp2p's usage of noise

export const ZEROLEN = uint8ArrayAlloc(0)

interface ICipherStateWithKey extends ICipherState {
  k: Uint8Array
}

export class CipherState implements ICipherState {
  public k?: Uint8Array
  public n: Nonce
  private readonly crypto: ICrypto

  constructor (crypto: ICrypto, k: Uint8Array | undefined = undefined, n = 0) {
    this.crypto = crypto
    this.k = k
    this.n = new Nonce(n)
  }

  public hasKey (): this is ICipherStateWithKey {
    return Boolean(this.k)
  }

  public encryptWithAd (ad: Uint8Array, plaintext: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    if (!this.hasKey()) {
      return plaintext
    }

    this.n.assertValue()
    const e = this.crypto.encrypt(plaintext, this.n.getBytes(), ad, this.k)
    this.n.increment()

    return e
  }

  public decryptWithAd (ad: Uint8Array, ciphertext: Uint8Array | Uint8ArrayList, dst?: Uint8Array): Uint8Array | Uint8ArrayList {
    if (!this.hasKey()) {
      return ciphertext
    }

    this.n.assertValue()
    const plaintext = this.crypto.decrypt(ciphertext, this.n.getBytes(), ad, this.k, dst)
    this.n.increment()

    return plaintext
  }
}

export class SymmetricState implements ISymmetricState {
  public cs: CipherState
  public ck: Uint8Array
  public h: Uint8Array
  private readonly crypto: ICrypto

  constructor (crypto: ICrypto, protocolName: string) {
    this.crypto = crypto

    const protocolNameBytes = uint8ArrayFromString(protocolName, 'utf-8')
    this.h = hashProtocolName(crypto, protocolNameBytes)

    this.ck = this.h
    this.cs = new CipherState(crypto)
  }

  public mixKey (ikm: Uint8Array): void {
    const [ck, tempK] = this.crypto.hkdf(this.ck, ikm)
    this.ck = ck
    this.cs = new CipherState(this.crypto, tempK)
  }

  public mixHash (data: Uint8Array | Uint8ArrayList): void {
    this.h = this.crypto.hash(new Uint8ArrayList(this.h, data))
  }

  public encryptAndHash (plaintext: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    const ciphertext = this.cs.encryptWithAd(this.h, plaintext)
    this.mixHash(ciphertext)
    return ciphertext
  }

  public decryptAndHash (ciphertext: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    const plaintext = this.cs.decryptWithAd(this.h, ciphertext)
    this.mixHash(ciphertext)
    return plaintext
  }

  public split (): [CipherState, CipherState] {
    const [tempK1, tempK2] = this.crypto.hkdf(this.ck, ZEROLEN)
    return [new CipherState(this.crypto, tempK1), new CipherState(this.crypto, tempK2)]
  }
}

// const MESSAGE_PATTERNS = ['e', 's', 'ee', 'es', 'se', 'ss'] as const
// type MessagePattern = Array<typeof MESSAGE_PATTERNS[number]>

export interface HandshakeStateInit {
  crypto: ICrypto
  protocolName: string
  initiator: boolean
  prologue: Uint8Array
  s?: KeyPair
  e?: KeyPair
  rs?: Uint8Array | Uint8ArrayList
  re?: Uint8Array | Uint8ArrayList
}

export abstract class AbstractHandshakeState implements IHandshakeState {
  public ss: SymmetricState
  public s?: KeyPair
  public e?: KeyPair
  public rs?: Uint8Array | Uint8ArrayList
  public re?: Uint8Array | Uint8ArrayList
  public initiator: boolean
  protected readonly crypto: ICrypto

  constructor (init: HandshakeStateInit) {
    const { crypto, protocolName, prologue, initiator, s, e, rs, re } = init
    this.crypto = crypto
    this.ss = new SymmetricState(crypto, protocolName)
    this.ss.mixHash(prologue)
    this.initiator = initiator
    this.s = s
    this.e = e
    this.rs = rs
    this.re = re
  }

  protected writeE (): Uint8Array {
    if (this.e) {
      throw new Error('ephemeral keypair is already set')
    }
    const e = this.crypto.generateKeypair()
    this.ss.mixHash(e.publicKey)
    this.e = e
    return e.publicKey
  }

  protected writeS (): Uint8Array | Uint8ArrayList {
    if (!this.s) {
      throw new Error('static keypair is not set')
    }
    return this.ss.encryptAndHash(this.s.publicKey)
  }

  protected writeEE (): void {
    if (!this.e) {
      throw new Error('ephemeral keypair is not set')
    }
    if (!this.re) {
      throw new Error('remote ephemeral public key is not set')
    }
    this.ss.mixKey(this.crypto.dh(this.e, this.re))
  }

  protected writeES (): void {
    if (this.initiator) {
      if (!this.e) {
        throw new Error('ephemeral keypair is not set')
      }
      if (!this.rs) {
        throw new Error('remote static public key is not set')
      }
      this.ss.mixKey(this.crypto.dh(this.e, this.rs))
    } else {
      if (!this.s) {
        throw new Error('static keypair is not set')
      }
      if (!this.re) {
        throw new Error('remote ephemeral public key is not set')
      }
      this.ss.mixKey(this.crypto.dh(this.s, this.re))
    }
  }

  protected writeSE (): void {
    if (this.initiator) {
      if (!this.s) {
        throw new Error('static keypair is not set')
      }
      if (!this.re) {
        throw new Error('remote ephemeral public key is not set')
      }
      this.ss.mixKey(this.crypto.dh(this.s, this.re))
    } else {
      if (!this.e) {
        throw new Error('ephemeral keypair is not set')
      }
      if (!this.rs) {
        throw new Error('remote static public key is not set')
      }
      this.ss.mixKey(this.crypto.dh(this.e, this.rs))
    }
  }

  protected readE (message: Uint8ArrayList, offset = 0): void {
    if (this.re) {
      throw new Error('remote ephemeral public key is already set')
    }
    if (message.byteLength < offset + 32) {
      throw new Error('message is not long enough')
    }
    this.re = message.sublist(offset, offset + 32)
    this.ss.mixHash(this.re)
  }

  protected readS (message: Uint8ArrayList, offset = 0): number {
    if (this.rs) {
      throw new Error('remote static public key is already set')
    }
    const cipherLength = 32 + (this.ss.cs.hasKey() ? 16 : 0)
    if (message.byteLength < offset + cipherLength) {
      throw new Error('message is not long enough')
    }
    const temp = message.sublist(offset, offset + cipherLength)
    this.rs = this.ss.decryptAndHash(temp)
    return cipherLength
  }

  protected readEE (): void {
    this.writeEE()
  }

  protected readES (): void {
    this.writeES()
  }

  protected readSE (): void {
    this.writeSE()
  }
}

/**
 * A IHandshakeState that's optimized for the XX pattern
 */
export class XXHandshakeState extends AbstractHandshakeState {
  // e
  writeMessageA (payload: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    return new Uint8ArrayList(this.writeE(), this.ss.encryptAndHash(payload))
  }

  // e, ee, s, es
  writeMessageB (payload: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    const e = this.writeE()
    this.writeEE()
    const encS = this.writeS()
    this.writeES()

    return new Uint8ArrayList(e, encS, this.ss.encryptAndHash(payload))
  }

  // s, se
  writeMessageC (payload: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList {
    const encS = this.writeS()
    this.writeSE()

    return new Uint8ArrayList(encS, this.ss.encryptAndHash(payload))
  }

  // e
  readMessageA (message: Uint8ArrayList): Uint8Array | Uint8ArrayList {
    try {
      this.readE(message)

      return this.ss.decryptAndHash(message.sublist(32))
    } catch (e) {
      throw new InvalidCryptoExchangeError(`handshake stage 0 validation fail: ${(e as Error).message}`)
    }
  }

  // e, ee, s, es
  readMessageB (message: Uint8ArrayList): Uint8Array | Uint8ArrayList {
    try {
      this.readE(message)
      this.readEE()
      const consumed = this.readS(message, 32)
      this.readES()

      return this.ss.decryptAndHash(message.sublist(32 + consumed))
    } catch (e) {
      throw new InvalidCryptoExchangeError(`handshake stage 1 validation fail: ${(e as Error).message}`)
    }
  }

  // s, se
  readMessageC (message: Uint8ArrayList): Uint8Array | Uint8ArrayList {
    try {
      const consumed = this.readS(message)
      this.readSE()

      return this.ss.decryptAndHash(message.sublist(consumed))
    } catch (e) {
      throw new InvalidCryptoExchangeError(`handshake stage 2 validation fail: ${(e as Error).message}`)
    }
  }
}

function hashProtocolName (crypto: ICrypto, protocolName: Uint8Array): Uint8Array {
  if (protocolName.length <= 32) {
    const h = uint8ArrayAlloc(32)
    h.set(protocolName)
    return h
  } else {
    return crypto.hash(protocolName)
  }
}

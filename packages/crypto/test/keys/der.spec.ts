/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { decodeDer } from '../../src/keys/rsa/der.ts'

describe('der', () => {
  it('rejects an integer whose length exceeds the buffer', () => {
    // INTEGER (0x02) with a long-form length claiming 1,000,000 bytes, but only
    // a single content byte present. Without a bound on the claimed length the
    // decoder loops ~1,000,000 times reading past the end of the buffer, so a
    // ~7-byte blob triggers large synchronous work. A crafted key like this
    // reaches decodeDer pre-verification via the Identify publicKey field.
    const malformed = Uint8Array.from([0x02, 0x84, 0x00, 0x0f, 0x42, 0x40, 0x01])

    expect(() => decodeDer(malformed)).to.throw(/invalid DER element length/)
  })

  it('rejects an object identifier whose length exceeds the buffer', () => {
    // OBJECT IDENTIFIER (0x06) is the other reader that loops on the claimed
    // length, so it must be bounded by the same guard.
    const malformed = Uint8Array.from([0x06, 0x84, 0x00, 0x0f, 0x42, 0x40, 0x01])

    expect(() => decodeDer(malformed)).to.throw(/invalid DER element length/)
  })

  it('rejects an indefinite-form length', () => {
    // 0x80 is a long-form length with zero length bytes (BER indefinite length);
    // parseInt yields NaN, which must be rejected rather than used as a length.
    const malformed = Uint8Array.from([0x02, 0x80])

    expect(() => decodeDer(malformed)).to.throw(/invalid DER element length/)
  })

  it('rejects a truncated long-form length header', () => {
    // 0x88 claims eight length bytes but only one is present, so the header
    // itself overruns the buffer.
    const malformed = Uint8Array.from([0x02, 0x88, 0x00])

    expect(() => decodeDer(malformed)).to.throw(/invalid DER element length/)
  })

  it('accepts an element whose length exactly fills the buffer', () => {
    // OCTET STRING (0x04) of two bytes with exactly two content bytes: the
    // boundary case that must NOT be rejected (guards against a >= off-by-one).
    const valid = Uint8Array.from([0x04, 0x02, 0xaa, 0xbb])

    expect(() => decodeDer(valid)).to.not.throw()
  })
})

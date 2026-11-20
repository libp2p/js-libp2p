import { generateKeyPair } from '@libp2p/crypto'
import { expect } from 'aegir/chai'
import { decodePublicKeyHeader } from '../src/key.ts'

describe('decodePublicKeyHeader', () => {
  it('reads type and data of a key protobuf', async () => {
    const key = await generateKeyPair('Ed25519')
    const decoded = decodePublicKeyHeader(key.publicKey.toProtobuf())

    expect(decoded?.type).to.equal(1)
    expect(decoded?.data).to.have.lengthOf(32)
  })

  it('returns undefined for non-protobuf bytes', () => {
    expect(decodePublicKeyHeader(new TextEncoder().encode('https://example.com'))).to.be.undefined()
    expect(decodePublicKeyHeader(Uint8Array.from([0x08, 0x01, 0x12, 0x05, 0x00]))).to.be.undefined()
  })

  it('rejects a non-canonical length varint', () => {
    const buf = new Uint8Array(36)
    buf.set([0x08, 0x01, 0x12, 0xA0, 0x80, 0x00])

    expect(decodePublicKeyHeader(buf)).to.be.undefined()
  })

  it('rejects a non-canonical type varint', () => {
    const buf = new Uint8Array(37)
    buf.set([0x08, 0x81, 0x00, 0x12, 0x20])

    expect(decodePublicKeyHeader(buf)).to.be.undefined()
  })
})

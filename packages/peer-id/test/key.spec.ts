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
})

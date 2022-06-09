/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { createPeerId, peerIdFromBytes, peerIdFromString } from '../src/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

describe('PeerId', () => {
  it('create an id without \'new\'', () => {
    // @ts-expect-error missing args
    expect(() => createPeerId()).to.throw(Error)
  })

  it('create a new id from multihash', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id.equals(buf)).to.be.true()
  })

  it('parses a v1 CID with the libp2p-key codec', async () => {
    const str = 'bafzaajaiaejca24q7uhr7adt3rtai4ixtn2r3q72kccwvwzg6wnfetwqyvrs5n2d'
    const id = peerIdFromString(str)
    expect(id.type).to.equal('Ed25519')
    expect(id.toString()).to.equal('12D3KooWH4G2B3x5BZHH3j2ccMsBLhzR8u1uzrAQshg429xGFGPk')
    expect(id.toCID().toString()).to.equal('bafzaajaiaejca24q7uhr7adt3rtai4ixtn2r3q72kccwvwzg6wnfetwqyvrs5n2d')
  })

  it('defaults to base58btc when stringifying', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id.toString()).to.equal('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa')
  })

  it('turns into a CID', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id.toCID().toString()).to.equal('bafzaajaiaejcda3tmul6p2537j5upxpjgz3jabbzxqrjqvhhfnthtnezvwibizjh')
  })

  it('equals a Uint8Array', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id.equals(buf)).to.be.true()
  })

  it('equals a PeerId', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id.equals(peerIdFromBytes(buf))).to.be.true()
  })

  it('parses a PeerId as Ed25519', async () => {
    const id = peerIdFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa')
    expect(id).to.have.property('type', 'Ed25519')
  })

  it('parses a PeerId as RSA', async () => {
    const id = peerIdFromString('QmZHBBrcBtDk7yVzcNUDJBJsZnVGtPHzpTzu16J7Sk6hbp')
    expect(id).to.have.property('type', 'RSA')
  })

  it('parses a PeerId as secp256k1', async () => {
    const id = peerIdFromString('16Uiu2HAkxSnqYGDU5iZTQrZyAcQDQHKrZqSNPBmKFifEagS2XfrL')
    expect(id).to.have.property('type', 'secp256k1')
  })

  it('decodes a PeerId as Ed25519', async () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id).to.have.property('type', 'Ed25519')
  })

  it('decodes a PeerId as RSA', async () => {
    const buf = uint8ArrayFromString('QmZHBBrcBtDk7yVzcNUDJBJsZnVGtPHzpTzu16J7Sk6hbp', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id).to.have.property('type', 'RSA')
  })

  it('decodes a PeerId as secp256k1', async () => {
    const buf = uint8ArrayFromString('16Uiu2HAkxSnqYGDU5iZTQrZyAcQDQHKrZqSNPBmKFifEagS2XfrL', 'base58btc')
    const id = peerIdFromBytes(buf)
    expect(id).to.have.property('type', 'secp256k1')
  })

  it('caches toString output', async () => {
    const buf = uint8ArrayFromString('16Uiu2HAkxSnqYGDU5iZTQrZyAcQDQHKrZqSNPBmKFifEagS2XfrL', 'base58btc')
    const id = peerIdFromBytes(buf)

    expect(id).to.have.property('string').that.is.not.ok()

    id.toString()

    expect(id).to.have.property('string').that.is.ok()
  })

  it('stringifies as JSON', () => {
    const buf = uint8ArrayFromString('16Uiu2HAkxSnqYGDU5iZTQrZyAcQDQHKrZqSNPBmKFifEagS2XfrL', 'base58btc')
    const id = peerIdFromBytes(buf)

    const res = JSON.parse(JSON.stringify({ id }))

    expect(res).to.have.property('id', id.toString())
  })
})

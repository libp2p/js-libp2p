/* eslint-env mocha */
import { createCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { expect } from 'aegir/chai'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { peerIdFromCID, peerIdFromMultihash, peerIdFromPrivateKey, peerIdFromPublicKey, peerIdFromString } from '../src/index.ts'
import type { PeerId } from '@libp2p/interface'

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const TRANSPORT_IPFS_GATEWAY_HTTP_CODE = 0x0920
const RAW_CODE = 0x55

const getCrypto = createCryptoLoader([secp256k1Crypto()])

const types = [
  'Ed25519',
  'secp256k1',
  'RSA'
] as const

describe('PeerId', () => {
  types.forEach(type => {
    describe(`${type} keys`, () => {
      let peerId: PeerId

      before(async () => {
        const key = type === 'RSA'
          ? await generateKeyPair(type, { bits: 1024 })
          : type === 'secp256k1'
            ? await generateKeyPair(type, { getCrypto })
            : await generateKeyPair(type)
        peerId = peerIdFromPrivateKey(key)
      })

      it('should create a PeerId from a Multihash', async () => {
        const id = peerIdFromMultihash(peerId.toMultihash())
        expect(id.equals(peerId)).to.be.true()
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should create a PeerId from a string', async () => {
        const id = peerIdFromString(peerId.toString())
        expect(id.equals(peerId)).to.be.true()
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should stringify to the base58btc multihash', async () => {
        expect(peerId.toString()).to.equal(base58btc.encode(peerId.toMultihash().bytes).slice(1))
      })

      it('should parse a v1 CID with the libp2p-key codec', async () => {
        const id = peerIdFromCID(peerId.toCID())
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should return the correct peer id from cid encoded peer id in base36', async () => {
        const id = peerIdFromString(peerId.toCID().toString(base36))
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should return the correct peer id from cid encoded peer id in base32', async () => {
        const id = peerIdFromString(peerId.toCID().toString(base32))
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should default to base58btc when stringifying', async () => {
        expect(base58btc.decode(`z${peerId.toString()}`)).to.be.ok()
      })

      it('equals a Uint8Array', async () => {
        const id = peerIdFromMultihash(peerId.toMultihash())
        expect(id.equals(peerId.toMultihash().bytes)).to.be.true()
      })

      it('equals nothing', async () => {
        expect(peerId.equals()).to.be.false()
      })

      it('equals undefined', async () => {
        expect(peerId.equals(undefined)).to.be.false()
      })

      it('caches toString output', async () => {
        const id = peerIdFromMultihash(peerId.toMultihash())

        expect(id).to.have.property('string').that.is.not.ok()

        id.toString()

        expect(id).to.have.property('string').that.is.ok()
      })

      it('stringifies as JSON', () => {
        const id = peerIdFromMultihash(peerId.toMultihash())
        const res = JSON.parse(JSON.stringify({ id }))

        expect(res).to.have.property('id', id.toString())
      })

      it('keys are equal after one is stringified', async () => {
        const peerId1 = peerIdFromMultihash(peerId.toMultihash())
        const peerId2 = peerIdFromMultihash(peerId.toMultihash())

        expect(peerId1).to.deep.equal(peerId2)

        peerId1.toString()

        expect(peerId1).to.deep.equal(peerId2)
      })

      it('should be matched by sinon', () => {
        const stub = Sinon.stub()
        stub(peerId)

        expect(stub.calledWith(peerId)).to.be.true()
      })
    })
  })

  it('parses an Ed25519 peer id to its key bytes', async () => {
    const key = await generateKeyPair('Ed25519')
    const peerId = peerIdFromString(peerIdFromPrivateKey(key).toString())

    expect(peerId.publicKey).to.equalBytes(key.publicKey.toProtobuf())
  })

  it('parses a secp256k1 peer id to its key bytes', async () => {
    const key = await generateKeyPair('secp256k1', { getCrypto })
    const peerId = peerIdFromString(peerIdFromPrivateKey(key).toString())

    expect(peerId.type).to.equal('secp256k1')
    expect(peerId.publicKey).to.equalBytes(key.publicKey.toProtobuf())
  })

  it('accepts RSA key bytes that match', async () => {
    const key = await generateKeyPair('RSA', { bits: 1024 })
    const peerId = peerIdFromMultihash(key.publicKey.toMultihash(), key.publicKey.toProtobuf())

    expect(peerId.publicKey).to.equalBytes(key.publicKey.toProtobuf())
  })

  it('rejects RSA key bytes that do not match', async () => {
    const key = await generateKeyPair('RSA', { bits: 1024 })
    const other = await generateKeyPair('RSA', { bits: 1024 })

    expect(() => peerIdFromMultihash(key.publicKey.toMultihash(), other.publicKey.toProtobuf()))
      .to.throw().with.property('name', 'InvalidPublicKeyError')
  })

  it('still parses URL peer ids', () => {
    const peerId = peerIdFromMultihash(identity.digest(new TextEncoder().encode('https://example.com')))

    expect(peerId.type).to.equal('url')
    expect(peerId.publicKey).to.be.undefined()
  })

  it('rejects ECDSA public keys', async () => {
    const key = await generateKeyPair('ECDSA')

    expect(() => peerIdFromPublicKey(key.publicKey))
      .to.throw().with.property('name', 'UnsupportedKeyTypeError')
  })

  it('throws on invalid CID multicodec', () => {
    // only libp2p and dag-pb are supported
    const invalidCID = CID.createV1(RAW_CODE, identity.digest(Uint8Array.from([0, 1, 2])))
    expect(() => {
      peerIdFromCID(invalidCID)
    }).to.throw(/invalid/i)
  })

  it('throws on invalid CID object', () => {
    const invalidCID = {}
    expect(() => {
      // @ts-expect-error invalid cid is invalid type
      peerIdFromCID(invalidCID)
    }).to.throw(/invalid/i)
  })

  describe('URL keys', () => {
    it('creates a url peer id from a multihash', async () => {
      const url = 'http://example.com/'
      const multihash = identity.digest(uint8ArrayFromString(url))
      const id = peerIdFromMultihash(multihash)
      expect(id).to.have.property('type', 'url')
      expect(id.toString()).to.equal(CID.createV1(TRANSPORT_IPFS_GATEWAY_HTTP_CODE, multihash).toString())
    })

    it('creates a url peer id from a CID', async () => {
      const url = 'http://example.com/'
      const cid = CID.createV1(TRANSPORT_IPFS_GATEWAY_HTTP_CODE, identity.digest(uint8ArrayFromString(url)))
      const id = peerIdFromCID(cid)
      expect(id).to.have.property('type', 'url')
      expect(id.toString()).to.equal(cid.toString())
    })
  })
})

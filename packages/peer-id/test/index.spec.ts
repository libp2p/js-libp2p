/* eslint-env mocha */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { expect } from 'aegir/chai'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { peerIdFromCID, peerIdFromMultihash, peerIdFromPrivateKey, peerIdFromString } from '../src/index.js'
import type { KeyType, PeerId } from '@libp2p/interface'

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const TRANSPORT_IPFS_GATEWAY_HTTP_CODE = 0x0920
const RAW_CODE = 0x55

const types: KeyType[] = [
  'Ed25519',
  'secp256k1',
  'RSA'
]

describe('PeerId', () => {
  types.forEach(type => {
    describe(`${type} keys`, () => {
      let peerId: PeerId

      before(async () => {
        const key = await generateKeyPair(type)
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

      it('should stringify to the public key', async () => {
        expect(peerId.toString()).to.equal(peerId.publicKey?.toString())
      })

      it('should parse a v1 CID with the libp2p-key codec', async () => {
        const id = peerIdFromCID(peerId.toCID())
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
      })

      it('should return the correct peer id from cid encoded peer id in base36 and base32', async () => {
        let id = peerIdFromString(peerId.toCID().toString(base36))
        expect(id.type).to.equal(type)
        expect(id.toString()).to.equal(peerId.toString())
        expect(id.toCID().toString()).to.equal(peerId.toCID().toString())
        id = peerIdFromString(peerId.toCID().toString(base32))
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

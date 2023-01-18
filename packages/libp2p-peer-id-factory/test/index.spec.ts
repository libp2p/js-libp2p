/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { keys } from '@libp2p/crypto'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { base16 } from 'multiformats/bases/base16'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { peerIdFromString, peerIdFromBytes, peerIdFromCID, createPeerId } from '@libp2p/peer-id'
import * as PeerIdFactory from '../src/index.js'
import util from 'util'
import testId from './fixtures/sample-id.js'
import goId from './fixtures/go-private-key.js'

const LIBP2P_KEY_CODE = 0x72
const RAW_CODE = 0x55

const testIdBytes = base16.decode(`f${testId.id}`)
const testIdDigest = Digest.decode(testIdBytes)
const testIdB58String = base58btc.encode(testIdBytes).substring(1)
const testIdB36String = base36.encode(testIdBytes)
const testIdCID = CID.createV1(LIBP2P_KEY_CODE, testIdDigest)
const testIdCIDString = testIdCID.toString()

describe('PeerId', () => {
  it('create an id without \'new\'', () => {
    // @ts-expect-error missing args
    expect(() => createPeerId()).to.throw(Error)
  })

  it('create a new id', async () => {
    const id = await PeerIdFactory.createEd25519PeerId()
    expect(id.toString().length).to.equal(52)
  })

  it('can be created for a secp256k1 key', async () => {
    const id = await PeerIdFactory.createSecp256k1PeerId()
    const expB58 = base58btc.encode((identity.digest(id.publicKey)).bytes).slice(1)
    expect(id.toString()).to.equal(expB58)
  })

  it('can get the public key from a Secp256k1 key', async () => {
    const original = await PeerIdFactory.createSecp256k1PeerId()
    const newId = peerIdFromString(original.toString())
    expect(original.publicKey).to.equalBytes(newId.publicKey)
  })

  it('recreate from a Uint8Array', () => {
    const id = peerIdFromBytes(testIdBytes)
    expect(testId.id).to.equal(uint8ArrayToString(id.multihash.bytes, 'base16'))
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from a B58 String', () => {
    const id = peerIdFromString(testIdB58String)
    expect(testIdB58String).to.equal(id.toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from CID object', () => {
    const id = peerIdFromCID(testIdCID)
    expect(testIdCIDString).to.equal(id.toCID().toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from Base58 String (CIDv0)', () => {
    const id = peerIdFromCID(CID.parse(testIdB58String))
    expect(testIdCIDString).to.equal(id.toCID().toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from Base36 String', () => {
    const id = peerIdFromString(testIdB36String)
    expect(testIdCIDString).to.equal(id.toCID().toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from CIDv1 Base32 (libp2p-key multicodec)', () => {
    const cid = CID.createV1(LIBP2P_KEY_CODE, testIdDigest)
    const id = peerIdFromCID(cid)
    expect(cid.toString()).to.equal(id.toCID().toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('recreate from CID Uint8Array', () => {
    const id = peerIdFromBytes(testIdCID.bytes)
    expect(testIdCIDString).to.equal(id.toCID().toString())
    expect(testIdBytes).to.equalBytes(id.multihash.bytes)
  })

  it('throws on invalid CID multicodec', () => {
    // only libp2p and dag-pb are supported
    const invalidCID = CID.createV1(RAW_CODE, testIdDigest)
    expect(() => {
      peerIdFromCID(invalidCID)
    }).to.throw(/invalid/i)
  })

  it('throws on invalid multihash value', () => {
    // using function code 0x50 that does not represent valid hash function
    // https://github.com/multiformats/js-multihash/blob/b85999d5768bf06f1b0f16b926ef2cb6d9c14265/src/constants.js#L345
    const invalidMultihash = uint8ArrayToString(Uint8Array.from([0x50, 0x1, 0x0]), 'base58btc')
    expect(() => {
      peerIdFromString(invalidMultihash)
    }).to.throw(/Non-base32hexpadupper character/i)
  })

  it('throws on invalid CID object', () => {
    const invalidCID = {}
    expect(() => {
      // @ts-expect-error invalid cid is invalid type
      peerIdFromCID(invalidCID)
    }).to.throw(/invalid/i)
  })

  it('recreate from a Public Key', async () => {
    const id = await PeerIdFactory.createFromPubKey(keys.unmarshalPublicKey(uint8ArrayFromString(testId.pubKey, 'base64pad')))

    expect(testIdB58String).to.equal(id.toString())
    expect(testIdBytes).to.deep.equal(id.multihash.bytes)
  })

  it('recreate from a Private Key', async () => {
    const id = await PeerIdFactory.createFromPrivKey(await keys.unmarshalPrivateKey(uint8ArrayFromString(testId.privKey, 'base64pad')))
    expect(testIdB58String).to.equal(id.toString())

    const encoded = await keys.unmarshalPrivateKey(uint8ArrayFromString(testId.privKey, 'base64pad'))
    const id2 = await PeerIdFactory.createFromPrivKey(encoded)

    if (id.type !== 'RSA') {
      throw new Error('Wrong key type found')
    }

    expect(testIdB58String).to.equal(id2.toString())
    expect(id.publicKey).to.deep.equal(id2.publicKey)
  })

  it('recreate from Protobuf', async () => {
    const id = await PeerIdFactory.createFromProtobuf(uint8ArrayFromString(testId.marshalled, 'base16'))
    expect(testIdB58String).to.equal(id.toString())

    const key = await keys.unmarshalPrivateKey(uint8ArrayFromString(testId.privKey, 'base64pad'))
    const id2 = await PeerIdFactory.createFromPrivKey(key)

    expect(testIdB58String).to.equal(id2.toString())
    expect(id.publicKey).to.equalBytes(id2.publicKey)
    expect(uint8ArrayToString(PeerIdFactory.exportToProtobuf(id).subarray(), 'base16')).to.equal(testId.marshalled)
  })

  it('recreate from embedded ed25519 key', async () => {
    const key = '12D3KooWRm8J3iL796zPFi2EtGGtUJn58AG67gcqzMFHZnnsTzqD'
    const id = peerIdFromString(key)
    expect(id.toString()).to.equal(key)

    if (id.publicKey == null) {
      throw new Error('No pubic key found on Ed25519 key')
    }

    const expB58 = base58btc.encode((identity.digest(id.publicKey)).bytes).slice(1)
    expect(id.toString()).to.equal(expB58)
  })

  it('recreate from embedded secp256k1 key', async () => {
    const key = '16Uiu2HAm5qw8UyXP2RLxQUx5KvtSN8DsTKz8quRGqGNC3SYiaB8E'
    const id = peerIdFromString(key)
    expect(id.toString()).to.equal(key)

    if (id.publicKey == null) {
      throw new Error('No pubic key found on secp256k1 key')
    }

    const expB58 = base58btc.encode((identity.digest(id.publicKey)).bytes).slice(1)
    expect(id.toString()).to.equal(expB58)
  })

  it('recreate from string key', async () => {
    const key = 'QmRsooYQasV5f5r834NSpdUtmejdQcpxXkK6qsozZWEihC'
    const id = peerIdFromString(key)
    expect(id.toString()).to.equal(key)
  })

  it('can be created from a secp256k1 public key', async () => {
    const privKey = await keys.generateKeyPair('secp256k1', 256)
    const id = await PeerIdFactory.createFromPubKey(privKey.public)

    if (id.publicKey == null) {
      throw new Error('No public key found on peer id created from secp256k1 public key')
    }

    const expB58 = base58btc.encode((identity.digest(id.publicKey)).bytes).slice(1)
    expect(id.toString()).to.equal(expB58)
  })

  it('can be created from a Secp256k1 private key', async () => {
    const privKey = await keys.generateKeyPair('secp256k1', 256)
    const id = await PeerIdFactory.createFromPrivKey(privKey)

    if (id.publicKey == null) {
      throw new Error('No public key found on peer id created from secp256k1 private key')
    }

    const expB58 = base58btc.encode((identity.digest(id.publicKey)).bytes).slice(1)
    expect(id.toString()).to.equal(expB58)
  })

  it('Compare generated ID with one created from PubKey', async () => {
    const id1 = await PeerIdFactory.createSecp256k1PeerId()
    const id2 = await PeerIdFactory.createFromPubKey(keys.unmarshalPublicKey(id1.publicKey))

    expect(id1.multihash.bytes).to.equalBytes(id2.multihash.bytes)
  })

  it('Works with default options', async function () {
    const id = await PeerIdFactory.createEd25519PeerId()
    expect(id.toString().length).to.equal(52)
  })

  it('Non-default # of bits', async function () {
    const shortId = await PeerIdFactory.createRSAPeerId({ bits: 512 })
    const longId = await PeerIdFactory.createRSAPeerId({ bits: 1024 })

    if (longId.privateKey == null) {
      throw new Error('No private key found on peer id')
    }

    expect(shortId.privateKey).to.have.property('length').that.is.lessThan(longId.privateKey.length)
  })

  it('equals', async () => {
    const ids = await Promise.all([
      PeerIdFactory.createEd25519PeerId(),
      PeerIdFactory.createEd25519PeerId()
    ])

    expect(ids[0].equals(ids[0])).to.equal(true)
    expect(ids[0].equals(ids[1])).to.equal(false)
    expect(ids[0].equals(ids[0].multihash.bytes)).to.equal(true)
    expect(ids[0].equals(ids[1].multihash.bytes)).to.equal(false)
  })

  describe('fromJSON', () => {
    it('full node', async () => {
      const id = await PeerIdFactory.createEd25519PeerId()
      const other = await PeerIdFactory.createFromJSON({
        id: id.toString(),
        privKey: id.privateKey != null ? uint8ArrayToString(id.privateKey, 'base64pad') : undefined,
        pubKey: uint8ArrayToString(id.publicKey, 'base64pad')
      })
      expect(id.toString()).to.equal(other.toString())
      expect(id.privateKey).to.equalBytes(other.privateKey)
      expect(id.publicKey).to.equalBytes(other.publicKey)
    })

    it('only id', async () => {
      const key = await keys.generateKeyPair('RSA', 1024)
      const digest = await key.public.hash()
      const id = peerIdFromBytes(digest)
      expect(id.privateKey).to.not.exist()
      expect(id.publicKey).to.not.exist()
      const other = await PeerIdFactory.createFromJSON({
        id: id.toString(),
        privKey: id.privateKey != null ? uint8ArrayToString(id.privateKey, 'base64pad') : undefined,
        pubKey: id.publicKey != null ? uint8ArrayToString(id.publicKey, 'base64pad') : undefined
      })
      expect(id.toString()).to.equal(other.toString())
    })

    it('go interop', async () => {
      const id = await PeerIdFactory.createFromJSON(goId)
      expect(id.toString()).to.eql(goId.id)
    })
  })

  it('keys are equal after one is stringified', async () => {
    const peerId = await PeerIdFactory.createEd25519PeerId()
    const peerId1 = peerIdFromString(peerId.toString())
    const peerId2 = peerIdFromString(peerId.toString())

    expect(peerId1).to.deep.equal(peerId2)

    peerId1.toString()

    expect(peerId1).to.deep.equal(peerId2)
  })

  describe('returns error instead of crashing', () => {
    const garbage = [
      uint8ArrayFromString('00010203040506070809', 'base16'),
      {}, null, false, undefined, true, 1, 0,
      uint8ArrayFromString(''), 'aGVsbG93b3JsZA==', 'helloworld', ''
    ]

    const fncs = ['createFromPubKey', 'createFromPrivKey', 'createFromJSON', 'createFromProtobuf']

    for (const gb of garbage) {
      for (const fn of fncs) {
        it(`${fn} (${util.inspect(gb)})`, async () => {
          try {
            // @ts-expect-error cannot use a string to index PeerId
            await PeerIdFactory[fn](gb)
          } catch (err) {
            expect(err).to.exist()
          }
        })
      }
    }
  })
})

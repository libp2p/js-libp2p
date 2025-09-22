import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import * as utils from '../src/utils.js'
import type { PubSubRPCMessage } from '../src/floodsub.js'
import type { Message } from '../src/index.js'

describe('utils', () => {
  it('randomSeqno', () => {
    const first = utils.randomSeqno()
    const second = utils.randomSeqno()

    expect(first).to.be.a('BigInt')
    expect(second).to.be.a('BigInt')
    expect(first).to.not.equal(second)
  })

  it('msgId should not generate same ID for two different Uint8Arrays', async () => {
    const key = await generateKeyPair('RSA', 512)
    const msgId0 = utils.msgId(key.publicKey, 1n)
    const msgId1 = utils.msgId(key.publicKey, 2n)
    expect(msgId0).to.not.deep.equal(msgId1)
  })

  it('anyMatch', () => {
    [
      { a: [1, 2, 3], b: [4, 5, 6], result: false },
      { a: [1, 2], b: [1, 2], result: true },
      { a: [1, 2, 3], b: [4, 5, 1], result: true },
      { a: [5, 6, 1], b: [1, 2, 3], result: true },
      { a: [], b: [], result: false },
      { a: [1], b: [2], result: false }
    ].forEach((test) => {
      expect(utils.anyMatch(new Set(test.a), new Set(test.b))).to.equal(test.result)
      expect(utils.anyMatch(new Set(test.a), test.b)).to.equal(test.result)
    })
  })

  it('ensureArray', () => {
    expect(utils.ensureArray('hello')).to.be.eql(['hello'])
    expect(utils.ensureArray([1, 2])).to.be.eql([1, 2])
  })

  it('converts an OUT msg.from to binary', async () => {
    const edKey = await generateKeyPair('Ed25519')
    const edPeer = peerIdFromPrivateKey(edKey)

    const rsaKey = await generateKeyPair('RSA', 512)
    const rsaPeer = peerIdFromPrivateKey(rsaKey)

    const m: Message[] = [{
      type: 'signed',
      from: edPeer,
      topic: '',
      data: new Uint8Array(),
      sequenceNumber: 1n,
      signature: new Uint8Array(),
      key: edPeer.publicKey
    }, {
      type: 'signed',
      from: rsaPeer,
      topic: '',
      data: new Uint8Array(),
      sequenceNumber: 1n,
      signature: new Uint8Array(),
      key: rsaKey.publicKey
    }]
    const expected: PubSubRPCMessage[] = [{
      from: edPeer.toMultihash().bytes,
      topic: '',
      data: new Uint8Array(),
      sequenceNumber: utils.bigIntToBytes(1n),
      signature: new Uint8Array(),
      key: publicKeyToProtobuf(edPeer.publicKey)
    }, {
      from: rsaPeer.toMultihash().bytes,
      topic: '',
      data: new Uint8Array(),
      sequenceNumber: utils.bigIntToBytes(1n),
      signature: new Uint8Array(),
      key: publicKeyToProtobuf(rsaKey.publicKey)
    }]
    for (let i = 0; i < m.length; i++) {
      expect(utils.toRpcMessage(m[i])).to.deep.equal(expected[i])
    }
  })

  it('converts non-negative BigInts to bytes and back', () => {
    expect(utils.bigIntFromBytes(utils.bigIntToBytes(1n))).to.equal(1n)

    const values = [
      0n,
      1n,
      100n,
      192832190818383818719287373223131n
    ]

    values.forEach(val => {
      expect(utils.bigIntFromBytes(utils.bigIntToBytes(val))).to.equal(val)
    })
  })

  it('ensures message is signed if public key is extractable', async () => {
    const dummyKeyPair = await generateKeyPair('RSA', 1024)
    const dummyPeerID = peerIdFromPrivateKey(dummyKeyPair)

    const secp256k1Key = await generateKeyPair('secp256k1')
    const secp256k1Peer = peerIdFromPrivateKey(secp256k1Key)

    const cases: PubSubRPCMessage[] = [
      {
        from: secp256k1Peer.toMultihash().bytes,
        topic: 'test',
        data: new Uint8Array(0),
        sequenceNumber: utils.bigIntToBytes(1n),
        signature: new Uint8Array(0)
      },
      {
        from: peerIdFromString('QmPNdSYk5Rfpo5euNqwtyizzmKXMNHdXeLjTQhcN4yfX22').toMultihash().bytes,
        topic: 'test',
        data: new Uint8Array(0),
        sequenceNumber: utils.bigIntToBytes(1n),
        signature: new Uint8Array(0)
      },
      {
        from: dummyPeerID.toMultihash().bytes,
        topic: 'test',
        data: new Uint8Array(0),
        sequenceNumber: utils.bigIntToBytes(1n),
        signature: new Uint8Array(0),
        key: publicKeyToProtobuf(dummyKeyPair.publicKey)
      },
      {
        from: (peerIdFromPrivateKey(await generateKeyPair('Ed25519'))).toMultihash().bytes,
        topic: 'test',
        data: new Uint8Array(0),
        sequenceNumber: utils.bigIntToBytes(1n),
        signature: new Uint8Array(0)
      }
    ]

    const expected = ['signed', 'unsigned', 'signed', 'signed']
    const actual = (await Promise.all(cases.map(utils.toMessage))).map(m => m.type)

    expect(actual).to.deep.equal(expected)
  })
})

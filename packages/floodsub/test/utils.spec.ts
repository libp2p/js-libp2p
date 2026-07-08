import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import * as utils from '../src/utils.ts'
import type { PubSubRPCMessage } from '../src/floodsub.ts'
import type { Message } from '../src/index.ts'

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
    const ed25519Key = await generateKeyPair('Ed25519')
    const secp256k1Key = await generateKeyPair('secp256k1')
    const rsaKey = await generateKeyPair('RSA', 1024)

    const cases = [{
      privateKey: secp256k1Key,
      includeKey: false,
      expectedType: 'signed'
    }, {
      privateKey: rsaKey,
      includeKey: false,
      expectedType: 'unsigned'
    }, {
      privateKey: rsaKey,
      includeKey: true,
      expectedType: 'signed'
    }, {
      privateKey: ed25519Key,
      includeKey: false,
      expectedType: 'signed'
    }] as const

    for (const { privateKey, includeKey, expectedType } of cases) {
      const peerId = peerIdFromPrivateKey(privateKey)

      const message = await utils.toMessage({
        from: peerId.toMultihash().bytes,
        topic: 'test',
        data: new Uint8Array(0),
        sequenceNumber: utils.bigIntToBytes(1n),
        signature: new Uint8Array(0),
        key: includeKey ? publicKeyToProtobuf(privateKey.publicKey) : undefined
      })

      expect(message.type).to.equal(expectedType)
      if (expectedType === 'signed') {
        if (message.type !== 'signed') {
          throw new Error('expected signed message')
        }

        expect(message.key.equals(privateKey.publicKey)).to.be.true()
      }
    }
  })

  it('treats a message with a key but missing signed fields as unsigned', async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    const message = await utils.toMessage({
      from: peerId.toMultihash().bytes,
      topic: 'test',
      data: new Uint8Array(0),
      key: publicKeyToProtobuf(privateKey.publicKey)
    })

    expect(message.type).to.equal('unsigned')
  })

  it('rejects a message that is missing from', async () => {
    await expect(utils.toMessage({
      topic: 'test',
      data: new Uint8Array(0)
    })).to.eventually.be.rejectedWith('RPC message was missing from')
  })

  it('rejects a message if the supplied key does not match from', async () => {
    const attackerKey = await generateKeyPair('Ed25519')
    const victimKey = await generateKeyPair('Ed25519')
    const victim = peerIdFromPrivateKey(victimKey)

    await expect(utils.toMessage({
      from: victim.toMultihash().bytes,
      topic: 'test',
      data: new Uint8Array(0),
      sequenceNumber: utils.bigIntToBytes(1n),
      signature: new Uint8Array(0),
      key: publicKeyToProtobuf(attackerKey.publicKey)
    })).to.eventually.be.rejectedWith('RPC message public key did not match from')
  })
})

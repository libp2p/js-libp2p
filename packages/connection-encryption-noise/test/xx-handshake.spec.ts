import { Buffer } from 'buffer'
import { assert, expect } from 'aegir/chai'
import { lpStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { pureJsCrypto } from '../src/crypto/js.js'
import { XXHandshake } from '../src/handshake-xx.js'
import { getPayload } from '../src/utils.js'
import { createPeerIdsFromFixtures } from './fixtures/peer.js'
import type { PeerId } from '@libp2p/interface/peer-id'

describe('XX Handshake', () => {
  let peerA: PeerId, peerB: PeerId, fakePeer: PeerId

  before(async () => {
    [peerA, peerB, fakePeer] = await createPeerIdsFromFixtures(3)
  })

  it('should propose, exchange and finish handshake', async () => {
    try {
      const duplex = duplexPair<Uint8Array>()
      const connectionFrom = lpStream(duplex[0])
      const connectionTo = lpStream(duplex[1])

      const prologue = Buffer.alloc(0)
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()

      const initPayload = await getPayload(peerA, staticKeysInitiator.publicKey)
      const handshakeInitator = new XXHandshake(true, initPayload, prologue, pureJsCrypto, staticKeysInitiator, connectionFrom, peerB)

      const respPayload = await getPayload(peerB, staticKeysResponder.publicKey)
      const handshakeResponder = new XXHandshake(false, respPayload, prologue, pureJsCrypto, staticKeysResponder, connectionTo, peerA)

      await handshakeInitator.propose()
      await handshakeResponder.propose()

      await handshakeResponder.exchange()
      await handshakeInitator.exchange()

      await handshakeInitator.finish()
      await handshakeResponder.finish()

      const sessionInitator = handshakeInitator.session
      const sessionResponder = handshakeResponder.session

      // Test shared key
      if (sessionInitator.cs1 && sessionResponder.cs1 && sessionInitator.cs2 && sessionResponder.cs2) {
        assert(uint8ArrayEquals(sessionInitator.cs1.k, sessionResponder.cs1.k))
        assert(uint8ArrayEquals(sessionInitator.cs2.k, sessionResponder.cs2.k))
      } else {
        assert(false)
      }

      // Test encryption and decryption
      const encrypted = handshakeInitator.encrypt(Buffer.from('encryptthis'), handshakeInitator.session)
      const { plaintext: decrypted, valid } = handshakeResponder.decrypt(encrypted, handshakeResponder.session)
      assert(uint8ArrayEquals(decrypted, Buffer.from('encryptthis')))
      assert(valid)
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('Initiator should fail to exchange handshake if given wrong public key in payload', async () => {
    try {
      const duplex = duplexPair<Uint8Array>()
      const connectionFrom = lpStream(duplex[0])
      const connectionTo = lpStream(duplex[1])

      const prologue = Buffer.alloc(0)
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()

      const initPayload = await getPayload(peerA, staticKeysInitiator.publicKey)
      const handshakeInitator = new XXHandshake(true, initPayload, prologue, pureJsCrypto, staticKeysInitiator, connectionFrom, fakePeer)

      const respPayload = await getPayload(peerB, staticKeysResponder.publicKey)
      const handshakeResponder = new XXHandshake(false, respPayload, prologue, pureJsCrypto, staticKeysResponder, connectionTo, peerA)

      await handshakeInitator.propose()
      await handshakeResponder.propose()

      await handshakeResponder.exchange()
      await handshakeInitator.exchange()

      assert(false, 'Should throw exception')
    } catch (e) {
      const err = e as Error
      expect(err.message).equals(`Error occurred while verifying signed payload: Payload identity key ${peerB.toString()} does not match expected remote peer ${fakePeer.toString()}`)
    }
  })

  it('Responder should fail to exchange handshake if given wrong public key in payload', async () => {
    try {
      const duplex = duplexPair<Uint8Array>()
      const connectionFrom = lpStream(duplex[0])
      const connectionTo = lpStream(duplex[1])

      const prologue = Buffer.alloc(0)
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()

      const initPayload = await getPayload(peerA, staticKeysInitiator.publicKey)
      const handshakeInitator = new XXHandshake(true, initPayload, prologue, pureJsCrypto, staticKeysInitiator, connectionFrom, peerB)

      const respPayload = await getPayload(peerB, staticKeysResponder.publicKey)
      const handshakeResponder = new XXHandshake(false, respPayload, prologue, pureJsCrypto, staticKeysResponder, connectionTo, fakePeer)

      await handshakeInitator.propose()
      await handshakeResponder.propose()

      await handshakeResponder.exchange()
      await handshakeInitator.exchange()

      await handshakeInitator.finish()
      await handshakeResponder.finish()

      assert(false, 'Should throw exception')
    } catch (e) {
      const err = e as Error
      expect(err.message).equals(`Error occurred while verifying signed payload: Payload identity key ${peerA.toString()} does not match expected remote peer ${fakePeer.toString()}`)
    }
  })
})

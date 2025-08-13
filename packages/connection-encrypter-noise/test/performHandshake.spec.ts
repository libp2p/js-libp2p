import { Buffer } from 'buffer'
import { defaultLogger } from '@libp2p/logger'
import { assert, expect } from 'aegir/chai'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { defaultCrypto } from '../src/crypto/index.js'
import { wrapCrypto } from '../src/crypto.js'
import { performHandshakeInitiator, performHandshakeResponder } from '../src/performHandshake.js'
import { createPeerIdsFromFixtures } from './fixtures/peer.js'
import type { PrivateKey, PeerId } from '@libp2p/interface'
import { multiaddrConnectionPair, lpStream } from '@libp2p/utils'

describe('performHandshake', () => {
  let peerA: { peerId: PeerId, privateKey: PrivateKey }
  let peerB: { peerId: PeerId, privateKey: PrivateKey }
  let fakePeer: { peerId: PeerId, privateKey: PrivateKey }

  before(async () => {
    [peerA, peerB, fakePeer] = await createPeerIdsFromFixtures(3)
    if (!peerA.privateKey || !peerB.privateKey || !fakePeer.privateKey) { throw new Error('unreachable') }
  })

  it('should propose, exchange and finish handshake', async () => {
    const duplex = multiaddrConnectionPair()
    const connectionInitiator = lpStream(duplex[0])
    const connectionResponder = lpStream(duplex[1])

    const prologue = Buffer.alloc(0)
    const staticKeysInitiator = defaultCrypto.generateX25519KeyPair()
    const staticKeysResponder = defaultCrypto.generateX25519KeyPair()

    const [initiator, responder] = await Promise.all([
      performHandshakeInitiator({
        log: defaultLogger().forComponent('test'),
        connection: connectionInitiator,
        crypto: wrapCrypto(defaultCrypto),
        privateKey: peerA.privateKey,
        prologue,
        remoteIdentityKey: peerB.privateKey.publicKey,
        s: staticKeysInitiator
      }),
      performHandshakeResponder({
        log: defaultLogger().forComponent('test'),
        connection: connectionResponder,
        crypto: wrapCrypto(defaultCrypto),
        privateKey: peerB.privateKey,
        prologue,
        remoteIdentityKey: peerA.privateKey.publicKey,
        s: staticKeysResponder
      })
    ])

    // Test encryption and decryption
    const encrypted = initiator.encrypt(Buffer.from('encryptthis'))
    const decrypted = responder.decrypt(encrypted)
    assert(uint8ArrayEquals(decrypted.subarray(), Buffer.from('encryptthis')))
  })

  it('Initiator should fail to exchange handshake if given wrong public key in payload', async () => {
    try {
      const duplex = multiaddrConnectionPair()
      const connectionInitiator = lpStream(duplex[0])
      const connectionResponder = lpStream(duplex[1])

      const prologue = Buffer.alloc(0)
      const staticKeysInitiator = defaultCrypto.generateX25519KeyPair()
      const staticKeysResponder = defaultCrypto.generateX25519KeyPair()

      await Promise.all([
        performHandshakeInitiator({
          log: defaultLogger().forComponent('test'),
          connection: connectionInitiator,
          crypto: wrapCrypto(defaultCrypto),
          privateKey: peerA.privateKey,
          prologue,
          remoteIdentityKey: fakePeer.privateKey.publicKey, // <----- look here
          s: staticKeysInitiator
        }),
        performHandshakeResponder({
          log: defaultLogger().forComponent('test'),
          connection: connectionResponder,
          crypto: wrapCrypto(defaultCrypto),
          privateKey: peerB.privateKey,
          prologue,
          remoteIdentityKey: peerA.privateKey.publicKey,
          s: staticKeysResponder
        })
      ])

      assert(false, 'Should throw exception')
    } catch (e) {
      expect((e as Error).message).equals(`Payload identity key ${peerB.privateKey.publicKey} does not match expected remote identity key ${fakePeer.privateKey.publicKey}`)
    }
  })

  it('Responder should fail to exchange handshake if given wrong public key in payload', async () => {
    try {
      const duplex = multiaddrConnectionPair()
      const connectionInitiator = lpStream(duplex[0])
      const connectionResponder = lpStream(duplex[1])

      const prologue = Buffer.alloc(0)
      const staticKeysInitiator = defaultCrypto.generateX25519KeyPair()
      const staticKeysResponder = defaultCrypto.generateX25519KeyPair()

      await Promise.all([
        performHandshakeInitiator({
          log: defaultLogger().forComponent('test'),
          connection: connectionInitiator,
          crypto: wrapCrypto(defaultCrypto),
          privateKey: peerA.privateKey,
          prologue,
          remoteIdentityKey: peerB.privateKey.publicKey,
          s: staticKeysInitiator
        }),
        performHandshakeResponder({
          log: defaultLogger().forComponent('test'),
          connection: connectionResponder,
          crypto: wrapCrypto(defaultCrypto),
          privateKey: peerB.privateKey,
          prologue,
          remoteIdentityKey: fakePeer.privateKey.publicKey,
          s: staticKeysResponder
        })
      ])

      assert(false, 'Should throw exception')
    } catch (e) {
      expect((e as Error).message).equals(`Payload identity key ${peerA.privateKey.publicKey} does not match expected remote identity key ${fakePeer.privateKey.publicKey}`)
    }
  })
})

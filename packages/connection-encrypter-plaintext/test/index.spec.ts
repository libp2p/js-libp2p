/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { duplexPair } from 'it-pair/duplex'
import sinon from 'sinon'
import { plaintext } from '../src/index.js'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

describe('plaintext', () => {
  let localPeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter
  let encrypterRemote: ConnectionEncrypter

  beforeEach(async () => {
    wrongPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const localKeyPair = await generateKeyPair('Ed25519')
    localPeer = peerIdFromPrivateKey(localKeyPair)

    encrypter = plaintext()({
      privateKey: localKeyPair,
      logger: defaultLogger()
    })
    encrypterRemote = plaintext()({
      privateKey: await generateKeyPair('Ed25519'),
      logger: defaultLogger()
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', async () => {
    const [inbound, outbound] = duplexPair<any>()

    await Promise.all([
      encrypter.secureInbound(inbound),
      encrypterRemote.secureOutbound(outbound, {
        remotePeer: wrongPeer
      })
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })

  it('should fail if the peer does not provide its public key', async () => {
    const keyPair = await generateKeyPair('RSA', 512)

    encrypter = plaintext()({
      privateKey: keyPair,
      logger: defaultLogger()
    })

    const [inbound, outbound] = duplexPair<any>()

    await expect(Promise.all([
      encrypter.secureInbound(inbound),
      encrypterRemote.secureOutbound(outbound, {
        remotePeer: localPeer
      })
    ]))
      .to.eventually.be.rejected.with.property('name', 'UnexpectedPeerError')
  })
})

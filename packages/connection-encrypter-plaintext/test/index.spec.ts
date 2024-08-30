/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { mockMultiaddrConnPair } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { plaintext } from '../src/index.js'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

describe('plaintext', () => {
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter
  let encrypterRemote: ConnectionEncrypter

  beforeEach(async () => {
    [remotePeer, wrongPeer] = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])

    encrypter = plaintext()({
      privateKey: await generateKeyPair('Ed25519'),
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
    const { inbound, outbound } = mockMultiaddrConnPair({
      remotePeer,
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234'),
        multiaddr('/ip4/127.0.0.1/tcp/1235')
      ]
    })

    await Promise.all([
      encrypterRemote.secureInbound(inbound),
      encrypter.secureOutbound(outbound, wrongPeer)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })
})

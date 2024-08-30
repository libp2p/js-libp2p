/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { mockMultiaddrConnPair } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { tls } from '../src/index.js'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

describe('tls', () => {
  let localPeer: PeerId
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter

  beforeEach(async () => {
    [remotePeer, wrongPeer] = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])

    const localKeyPair = await generateKeyPair('Ed25519')
    localPeer = peerIdFromPrivateKey(localKeyPair)

    encrypter = tls()({
      privateKey: localKeyPair,
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
      encrypter.secureInbound(inbound, {
        remotePeer
      }),
      encrypter.secureOutbound(outbound, {
        remotePeer: wrongPeer
      })
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })

  it('should fail if the peer does not provide its public key', async () => {
    const keyPair = await generateKeyPair('RSA', 512)
    const peer = peerIdFromPrivateKey(keyPair)
    remotePeer = peerIdFromMultihash(peer.toMultihash())

    encrypter = tls()({
      privateKey: keyPair,
      logger: defaultLogger()
    })

    const { inbound, outbound } = mockMultiaddrConnPair({
      remotePeer,
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234'),
        multiaddr('/ip4/127.0.0.1/tcp/1235')
      ]
    })

    await expect(Promise.all([
      encrypter.secureInbound(inbound, {
        remotePeer
      }),
      encrypter.secureOutbound(outbound, {
        remotePeer: localPeer
      })
    ]))
      .to.eventually.be.rejected.with.property('name', 'UnexpectedPeerError')
  })
})

/* eslint-env mocha */

import {
  InvalidCryptoExchangeError,
  UnexpectedPeerError
} from '@libp2p/interface-connection-encrypter/errors'
import { mockMultiaddrConnPair } from '@libp2p/interface-mocks'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { createEd25519PeerId, createRSAPeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { plaintext } from '../../src/insecure/index.js'
import type { ConnectionEncrypter } from '@libp2p/interface-connection-encrypter'
import type { PeerId } from '@libp2p/interface-peer-id'

describe('plaintext', () => {
  let localPeer: PeerId
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter

  beforeEach(async () => {
    [localPeer, remotePeer, wrongPeer] = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId(),
      createEd25519PeerId()
    ])

    encrypter = plaintext()()
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
      encrypter.secureInbound(remotePeer, inbound),
      encrypter.secureOutbound(localPeer, outbound, wrongPeer)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('code', UnexpectedPeerError.code)
    })
  })

  it('should fail if the peer does not provide its public key', async () => {
    const peer = await createRSAPeerId()
    remotePeer = peerIdFromBytes(peer.toBytes())

    const { inbound, outbound } = mockMultiaddrConnPair({
      remotePeer,
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234'),
        multiaddr('/ip4/127.0.0.1/tcp/1235')
      ]
    })

    await expect(Promise.all([
      encrypter.secureInbound(localPeer, inbound),
      encrypter.secureOutbound(remotePeer, outbound, localPeer)
    ]))
      .to.eventually.be.rejected.with.property('code', InvalidCryptoExchangeError.code)
  })
})

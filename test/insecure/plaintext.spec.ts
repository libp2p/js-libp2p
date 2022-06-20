/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import Peers from '../fixtures/peers.js'
import { Plaintext } from '../../src/insecure/index.js'
import {
  InvalidCryptoExchangeError,
  UnexpectedPeerError
} from '@libp2p/interface-connection-encrypter/errors'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createFromJSON, createRSAPeerId } from '@libp2p/peer-id-factory'
import type { ConnectionEncrypter } from '@libp2p/interface-connection-encrypter'
import { mockMultiaddrConnPair } from '@libp2p/interface-mocks'
import { Multiaddr } from '@multiformats/multiaddr'
import { peerIdFromBytes } from '@libp2p/peer-id'

describe('plaintext', () => {
  let localPeer: PeerId
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let plaintext: ConnectionEncrypter

  beforeEach(async () => {
    [localPeer, remotePeer, wrongPeer] = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1]),
      createFromJSON(Peers[2])
    ])

    plaintext = new Plaintext()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({
      remotePeer,
      addrs: [
        new Multiaddr('/ip4/127.0.0.1/tcp/1234'),
        new Multiaddr('/ip4/127.0.0.1/tcp/1235')
      ]
    })

    await Promise.all([
      plaintext.secureInbound(remotePeer, inbound),
      plaintext.secureOutbound(localPeer, outbound, wrongPeer)
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
        new Multiaddr('/ip4/127.0.0.1/tcp/1234'),
        new Multiaddr('/ip4/127.0.0.1/tcp/1235')
      ]
    })

    await expect(Promise.all([
      plaintext.secureInbound(localPeer, inbound),
      plaintext.secureOutbound(remotePeer, outbound, localPeer)
    ]))
      .to.eventually.be.rejected.with.property('code', InvalidCryptoExchangeError.code)
  })
})

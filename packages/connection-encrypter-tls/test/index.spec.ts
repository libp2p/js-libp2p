/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { mockMultiaddrConnPair } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { tls } from '../src/index.js'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

describe('tls', () => {
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter

  beforeEach(async () => {
    [remotePeer, wrongPeer] = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])

    encrypter = tls()({
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
      encrypter.secureInbound(inbound, remotePeer),
      encrypter.secureOutbound(outbound, wrongPeer)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })
})

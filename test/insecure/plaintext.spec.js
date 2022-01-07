'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const PeerId = require('peer-id')
const duplexPair = require('it-pair/duplex')

const peers = require('../fixtures/rsa_peers')
const ed25519Peers = require('../fixtures/peers')
const plaintext = require('../../src/insecure/plaintext')
const {
  InvalidCryptoExchangeError,
  UnexpectedPeerError
} = require('libp2p-interfaces/src/crypto/errors')

describe('plaintext', () => {
  let localPeer
  let remotePeer
  let wrongPeer
  let localPeerEd25519
  let remotePeerEd25519

  before(async () => {
    [localPeer, remotePeer, wrongPeer] = await Promise.all([
      PeerId.createFromJSON(peers[0]),
      PeerId.createFromJSON(peers[1]),
      PeerId.createFromJSON(peers[2])
    ]);

    [localPeerEd25519, remotePeerEd25519] = await Promise.all([
      PeerId.createFromJSON(ed25519Peers[0]),
      PeerId.createFromJSON(ed25519Peers[1])
    ])
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', () => {
    const [localConn, remoteConn] = duplexPair()

    // When we attempt to get the remote peer key, return the wrong peers pub key
    sinon.stub(remotePeer.pubKey, 'marshal').callsFake(() => {
      return wrongPeer.pubKey.marshal()
    })

    return Promise.all([
      plaintext.secureInbound(remotePeer, localConn),
      plaintext.secureOutbound(localPeer, remoteConn, remotePeer)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('code', UnexpectedPeerError.code)
    })
  })

  it('should fail if the peer does not provide its public key', () => {
    const [localConn, remoteConn] = duplexPair()

    // When we attempt to get the remote peer key, return the wrong peers pub key
    sinon.stub(remotePeer.pubKey, 'marshal').callsFake(() => {
      return new Uint8Array(0)
    })

    return Promise.all([
      plaintext.secureInbound(remotePeer, localConn),
      plaintext.secureOutbound(localPeer, remoteConn, remotePeer)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('code', InvalidCryptoExchangeError.code)
    })
  })

  // TODO plaintext should support other PeerId encryption methods
  // but for now it only supports RSA so ensure a proper error is thrown
  it('should fail if the PeerId used is not RSA encrypted', () => {
    const [localConn, remoteConn] = duplexPair()

    return Promise.all([
      plaintext.secureInbound(remotePeerEd25519, localConn),
      plaintext.secureOutbound(localPeerEd25519, remoteConn, remotePeerEd25519)
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('code', InvalidCryptoExchangeError.code)
    })
  })
})

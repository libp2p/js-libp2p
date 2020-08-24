'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const PeerId = require('peer-id')
const duplexPair = require('it-pair/duplex')

const peers = require('../fixtures/peers')
const plaintext = require('../../src/insecure/plaintext')
const {
  InvalidCryptoExchangeError,
  UnexpectedPeerError
} = require('libp2p-interfaces/src/crypto/errors')

describe('plaintext', () => {
  let localPeer
  let remotePeer
  let wrongPeer

  before(async () => {
    [localPeer, remotePeer, wrongPeer] = await Promise.all([
      PeerId.createFromJSON(peers[0]),
      PeerId.createFromJSON(peers[1]),
      PeerId.createFromJSON(peers[2])
    ])
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', () => {
    const [localConn, remoteConn] = duplexPair()

    // When we attempt to get the remote peer key, return the wrong peers pub key
    sinon.stub(remotePeer, 'marshalPubKey').callsFake(() => {
      return wrongPeer.marshalPubKey()
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
    sinon.stub(remotePeer, 'marshalPubKey').callsFake(() => {
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
})

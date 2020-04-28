'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-bytes'))
const { expect } = chai
const sinon = require('sinon')

const PeerId = require('peer-id')
const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

describe('keyBook', () => {
  let peerId, peerStore, kb

  beforeEach(async () => {
    [peerId] = await peerUtils.createPeerId()
    peerStore = new PeerStore()
    kb = peerStore.keyBook
  })

  it('throwns invalid parameters error if invalid PeerId is provided', () => {
    try {
      kb.set('invalid peerId')
    } catch (err) {
      expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
      return
    }
    throw new Error('invalid peerId should throw error')
  })

  it('stores the peerId in the book and returns the public key', () => {
    // Set PeerId
    kb.set(peerId)

    // Get public key
    const pubKey = kb.get(peerId)
    expect(peerId.pubKey.bytes).to.equalBytes(pubKey.bytes)
  })

  it('should not store if already stored', () => {
    const spy = sinon.spy(kb, '_setData')

    // Set PeerId
    kb.set(peerId)
    kb.set(peerId)

    expect(spy).to.have.property('callCount', 1)
  })

  it('stores if already stored but there was no public key stored', () => {
    const spy = sinon.spy(kb, '_setData')

    // Set PeerId without public key
    const p = PeerId.createFromB58String(peerId.toB58String())
    kb.set(p)

    // Set complete peerId
    kb.set(peerId)

    expect(spy).to.have.property('callCount', 2)
  })
})

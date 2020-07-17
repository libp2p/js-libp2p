'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-bytes'))
const { expect } = chai
const sinon = require('sinon')

const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

describe('keyBook', () => {
  let peerId, peerStore, kb

  beforeEach(async () => {
    [peerId] = await peerUtils.createPeerId()
    peerStore = new PeerStore({ peerId })
    kb = peerStore.keyBook
  })

  it('throws invalid parameters error if invalid PeerId is provided in set', () => {
    try {
      kb.set('invalid peerId')
    } catch (err) {
      expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
      return
    }
    throw new Error('invalid peerId should throw error')
  })

  it('throws invalid parameters error if invalid PeerId is provided in get', () => {
    try {
      kb.get('invalid peerId')
    } catch (err) {
      expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
      return
    }
    throw new Error('invalid peerId should throw error')
  })

  it('stores the peerId in the book and returns the public key', () => {
    // Set PeerId
    kb.set(peerId, peerId.pubKey)

    // Get public key
    const pubKey = kb.get(peerId)
    expect(peerId.pubKey.bytes).to.equalBytes(pubKey.bytes)
  })

  it('should not store if already stored', () => {
    const spy = sinon.spy(kb, '_setData')

    // Set PeerId
    kb.set(peerId, peerId.pubKey)
    kb.set(peerId, peerId.pubKey)

    expect(spy).to.have.property('callCount', 1)
  })
})

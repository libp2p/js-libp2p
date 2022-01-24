'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { MemoryDatastore } = require('datastore-core/memory')
const PeerStore = require('../../src/peer-store')
const pDefer = require('p-defer')
const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

/**
 * @typedef {import('../../src/peer-store/types').PeerStore} PeerStore
 * @typedef {import('../../src/peer-store/types').KeyBook} KeyBook
 * @typedef {import('peer-id')} PeerId
 */

describe('keyBook', () => {
  /** @type {PeerId} */
  let peerId
  /** @type {PeerStore} */
  let peerStore
  /** @type {KeyBook} */
  let kb
  /** @type {MemoryDatastore} */
  let datastore

  beforeEach(async () => {
    [peerId] = await peerUtils.createPeerId()
    datastore = new MemoryDatastore()
    peerStore = new PeerStore({
      peerId,
      datastore
    })
    kb = peerStore.keyBook
  })

  it('throws invalid parameters error if invalid PeerId is provided in set', async () => {
    try {
      await kb.set('invalid peerId')
    } catch (/** @type {any} */ err) {
      expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
      return
    }
    throw new Error('invalid peerId should throw error')
  })

  it('throws invalid parameters error if invalid PeerId is provided in get', async () => {
    try {
      await kb.get('invalid peerId')
    } catch (/** @type {any} */ err) {
      expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
      return
    }
    throw new Error('invalid peerId should throw error')
  })

  it('stores the peerId in the book and returns the public key', async () => {
    // Set PeerId
    await kb.set(peerId, peerId.pubKey)

    // Get public key
    const pubKey = await kb.get(peerId)
    expect(peerId.pubKey.bytes).to.equalBytes(pubKey.bytes)
  })

  it('should not store if already stored', async () => {
    const spy = sinon.spy(datastore, 'put')

    // Set PeerId
    await kb.set(peerId, peerId.pubKey)
    await kb.set(peerId, peerId.pubKey)

    expect(spy).to.have.property('callCount', 1)
  })

  it('should emit an event when setting a key', async () => {
    const defer = pDefer()

    peerStore.on('change:pubkey', ({ peerId: id, pubKey }) => {
      expect(id.toB58String()).to.equal(peerId.toB58String())
      expect(pubKey.bytes).to.equalBytes(peerId.pubKey.bytes)
      defer.resolve()
    })

    // Set PeerId
    await kb.set(peerId, peerId.pubKey)
    await defer.promise
  })

  it('should not set when key does not match', async () => {
    const [edKey] = await peerUtils.createPeerId({ fixture: false, opts: { keyType: 'Ed25519' } })

    // Set PeerId
    await expect(kb.set(edKey, peerId.pubKey)).to.eventually.be.rejectedWith(/bytes do not match/)
  })

  it('should emit an event when deleting a key', async () => {
    const defer = pDefer()

    await kb.set(peerId, peerId.pubKey)

    peerStore.on('change:pubkey', ({ peerId: id, pubKey }) => {
      expect(id.toB58String()).to.equal(peerId.toB58String())
      expect(pubKey).to.be.undefined()
      defer.resolve()
    })

    await kb.delete(peerId)
    await defer.promise
  })
})

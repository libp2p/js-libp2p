/* eslint-env mocha */

import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { PeerQueue } from '../src/peer-queue.js'

describe('peer queue', () => {
  it('should have jobs', async () => {
    const deferred = pDefer()

    const peerIdA = await createEd25519PeerId()
    const peerIdB = await createEd25519PeerId()
    const queue = new PeerQueue({
      concurrency: 1
    })

    expect(queue.has(peerIdA)).to.be.false()

    void queue.add(async () => {
      await deferred.promise
    }, {
      peerId: peerIdB
    })

    void queue.add(async () => {
      await deferred.promise
    }, {
      peerId: peerIdA
    })

    expect(queue.has(peerIdA)).to.be.true()

    deferred.resolve()

    await queue.onIdle()

    expect(queue.has(peerIdA)).to.be.false()
  })

  it('can join existing jobs', async () => {
    const value = 'hello world'
    const deferred = pDefer<string>()

    const peerIdA = await createEd25519PeerId()
    const queue = new PeerQueue<string>({
      concurrency: 1
    })

    expect(queue.has(peerIdA)).to.be.false()
    expect(queue.find(peerIdA)).to.be.undefined()

    void queue.add(async () => {
      return deferred.promise
    }, {
      peerId: peerIdA
    })

    const job = queue.find(peerIdA)
    const join = job?.join()

    deferred.resolve(value)

    await expect(join).to.eventually.equal(value)

    expect(queue.has(peerIdA)).to.be.false()
    expect(queue.find(peerIdA)).to.be.undefined()
  })

  it('can join an existing job that fails', async () => {
    const error = new Error('nope!')
    const deferred = pDefer<string>()

    const peerIdA = await createEd25519PeerId()
    const queue = new PeerQueue<string>({
      concurrency: 1
    })

    void queue.add(async () => {
      return deferred.promise
    }, {
      peerId: peerIdA
    })
      .catch(() => {})

    const job = queue.find(peerIdA)
    const joinedJob = job?.join()

    deferred.reject(error)

    await expect(joinedJob).to.eventually.rejected
      .with.property('message', error.message)
  })

  it('cannot join jobs after clear', async () => {
    const value = 'hello world'
    const deferred = pDefer<string>()

    const peerIdA = await createEd25519PeerId()
    const queue = new PeerQueue<string>({
      concurrency: 1
    })

    expect(queue.has(peerIdA)).to.be.false()
    expect(queue.find(peerIdA)).to.be.undefined()

    void queue.add(async () => {
      return deferred.promise
    }, {
      peerId: peerIdA
    }).catch(() => {})

    queue.clear()

    expect(queue.find(peerIdA)).to.be.undefined()

    deferred.resolve(value)
  })
})

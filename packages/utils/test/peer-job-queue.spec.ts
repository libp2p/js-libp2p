/* eslint-env mocha */

import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { PeerJobQueue } from '../src/peer-job-queue.js'

describe('peer job queue', () => {
  it('should have jobs', async () => {
    const deferred = pDefer()

    const peerIdA = await createEd25519PeerId()
    const peerIdB = await createEd25519PeerId()
    const queue = new PeerJobQueue({
      concurrency: 1
    })

    expect(queue.hasJob(peerIdA)).to.be.false()

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

    expect(queue.hasJob(peerIdA)).to.be.true()

    deferred.resolve()

    await queue.onIdle()

    expect(queue.hasJob(peerIdA)).to.be.false()
  })

  it('can join existing jobs', async () => {
    const value = 'hello world'
    const deferred = pDefer<string>()

    const peerIdA = await createEd25519PeerId()
    const queue = new PeerJobQueue({
      concurrency: 1
    })

    expect(queue.hasJob(peerIdA)).to.be.false()

    await expect(queue.joinJob(peerIdA)).to.eventually.rejected
      .with.property('code', 'ERR_NO_JOB_FOR_PEER_ID')

    void queue.add(async () => {
      return deferred.promise
    }, {
      peerId: peerIdA
    })

    const join = queue.joinJob<string>(peerIdA)

    deferred.resolve(value)

    await expect(join).to.eventually.equal(value)

    expect(queue.hasJob(peerIdA)).to.be.false()

    await expect(queue.joinJob(peerIdA)).to.eventually.rejected
      .with.property('code', 'ERR_NO_JOB_FOR_PEER_ID')
  })

  it('can join an existing job that fails', async () => {
    const error = new Error('nope!')
    const deferred = pDefer<string>()

    const peerIdA = await createEd25519PeerId()
    const queue = new PeerJobQueue({
      concurrency: 1
    })

    void queue.add(async () => {
      return deferred.promise
    }, {
      peerId: peerIdA
    })
      .catch(() => {})

    const joinedJob = queue.joinJob(peerIdA)

    deferred.reject(error)

    await expect(joinedJob).to.eventually.rejected
      .with.property('message', error.message)
  })
})

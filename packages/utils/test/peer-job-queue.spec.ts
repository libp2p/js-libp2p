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
})

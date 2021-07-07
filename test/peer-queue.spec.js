/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const PeerQueue = require('../src/peer-list/peer-queue')
const uint8ArrayFromString = require('uint8arrays/from-string')

describe('PeerQueue', () => {
  it('basics', async () => {
    const p1 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))
    const p2 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32'))
    const p3 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33'))
    const p4 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34'))
    const p5 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))

    const peer = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))

    const pq = await PeerQueue.fromPeerId(peer)

    await pq.enqueue(p3)
    await pq.enqueue(p1)
    await pq.enqueue(p2)
    await pq.enqueue(p4)
    await pq.enqueue(p5)
    await pq.enqueue(p1)

    expect([
      pq.dequeue(),
      pq.dequeue(),
      pq.dequeue(),
      pq.dequeue(),
      pq.dequeue(),
      pq.dequeue()
    ].map((m) => m.toB58String())).to.be.eql([
      p1, p1, p1, p4, p3, p2
    ].map((m) => m.toB58String()))

    expect(pq.length).to.be.eql(0)
  })
})

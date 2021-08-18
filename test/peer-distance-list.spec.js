/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const kadUtils = require('../src/utils')
const PeerDistanceList = require('../src/peer-list/peer-distance-list')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

describe('PeerDistanceList', () => {
  const p1 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))
  const p2 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32'))
  const p3 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33'))
  const p4 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34'))
  const p5 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))
  const p6 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a35'))
  const p7 = new PeerId(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32'))

  let key
  before(async () => {
    key = await kadUtils.convertPeerId(p1)
  })

  describe('basics', () => {
    it('add', async () => {
      const pdl = new PeerDistanceList(key)

      await pdl.add(p3)
      await pdl.add(p1)
      await pdl.add(p2)
      await pdl.add(p4)
      await pdl.add(p5)
      await pdl.add(p1)

      // Note: p1 and p5 are equal
      expect(pdl.length).to.eql(4)
      expect(pdl.peers).to.be.eql([p1, p4, p3, p2])
    })

    it('capacity', async () => {
      const pdl = new PeerDistanceList(key, 3)

      await pdl.add(p1)
      await pdl.add(p2)
      await pdl.add(p3)
      await pdl.add(p4)
      await pdl.add(p5)
      await pdl.add(p6)

      // Note: p1 and p5 are equal
      expect(pdl.length).to.eql(3)

      // Closer peers added later should replace further
      // peers added earlier
      expect(pdl.peers).to.be.eql([p1, p6, p4])
    })
  })

  describe('closer', () => {
    let pdl
    before(async () => {
      pdl = new PeerDistanceList(key)

      await pdl.add(p1)
      await pdl.add(p2)
      await pdl.add(p3)
      await pdl.add(p4)
    })

    it('single closer peer', async () => {
      const closer = await pdl.anyCloser([p6])

      expect(closer).to.be.eql(true)
    })

    it('single further peer', async () => {
      const closer = await pdl.anyCloser([p7])

      expect(closer).to.be.eql(false)
    })

    it('closer and further peer', async () => {
      const closer = await pdl.anyCloser([p6, p7])

      expect(closer).to.be.eql(true)
    })

    it('single peer equal to furthest in list', async () => {
      const closer = await pdl.anyCloser([p2])

      expect(closer).to.be.eql(false)
    })

    it('no peers', async () => {
      const closer = await pdl.anyCloser([])

      expect(closer).to.be.eql(false)
    })

    it('empty peer distance list', async () => {
      const pdl = new PeerDistanceList(key)
      const closer = await pdl.anyCloser([p1])

      expect(closer).to.be.eql(true)
    })

    it('empty peer distance list and no peers', async () => {
      const pdl = new PeerDistanceList(key)
      const closer = await pdl.anyCloser([])

      expect(closer).to.be.eql(false)
    })
  })
})

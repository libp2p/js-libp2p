/* eslint-env mocha */

import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { PeerDistanceList } from '../src/peer-distance-list.js'
import * as kadUtils from '../src/utils.js'

describe('PeerDistanceList', () => {
  const p1 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1'), multiaddrs: [] }
  const p2 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), multiaddrs: [] }
  const p3 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE3'), multiaddrs: [] }
  const p4 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE4'), multiaddrs: [] }
  const p5 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1'), multiaddrs: [] }
  const p6 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE5'), multiaddrs: [] }
  const p7 = { id: peerIdFromString('12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), multiaddrs: [] }

  let key: Uint8Array
  before(async () => {
    key = await kadUtils.convertPeerId(p1.id)
  })

  describe('basics', () => {
    it('add', async () => {
      const pdl = new PeerDistanceList(key, 100)

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
      expect(pdl.peers).to.be.eql([p1, p4, p3])
    })
  })

  describe('closer', () => {
    let pdl: PeerDistanceList

    before(async () => {
      pdl = new PeerDistanceList(key, 100)

      await pdl.add(p1)
      await pdl.add(p2)
      await pdl.add(p3)
      await pdl.add(p4)
    })

    it('single closer peer', async () => {
      const closer = await pdl.anyCloser([p6.id])

      expect(closer).to.be.eql(true)
    })

    it('single further peer', async () => {
      const closer = await pdl.anyCloser([p7.id])

      expect(closer).to.be.eql(false)
    })

    it('closer and further peer', async () => {
      const closer = await pdl.anyCloser([p6.id, p7.id])

      expect(closer).to.be.eql(true)
    })

    it('single peer equal to furthest in list', async () => {
      const closer = await pdl.anyCloser([p2.id])

      expect(closer).to.be.eql(false)
    })

    it('no peers', async () => {
      const closer = await pdl.anyCloser([])

      expect(closer).to.be.eql(false)
    })

    it('empty peer distance list', async () => {
      const pdl = new PeerDistanceList(key, 100)
      const closer = await pdl.anyCloser([p1.id])

      expect(closer).to.be.eql(true)
    })

    it('empty peer distance list and no peers', async () => {
      const pdl = new PeerDistanceList(key, 100)
      const closer = await pdl.anyCloser([])

      expect(closer).to.be.eql(false)
    })
  })
})

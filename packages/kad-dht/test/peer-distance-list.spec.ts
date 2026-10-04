import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { PeerDistanceList } from '../src/peer-distance-list.ts'
import * as kadUtils from '../src/utils.ts'

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
      expect(pdl.peers.map(({ peer }) => peer)).to.be.eql([p1, p4, p3, p2])
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
      expect(pdl.peers.map(({ peer }) => peer)).to.be.eql([p1, p4, p3])
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

  describe('canAddKadId', () => {
    // distance to the key (= p1): p1 < p4 < p3 < p6 < p2 (p7 equals p2)
    it('returns true when the list is under capacity', async () => {
      const pdl = new PeerDistanceList(key, 100)
      await pdl.add(p1)
      await pdl.add(p2)

      // p7 is as far as the current furthest (p2), but there is spare capacity
      const kadId = await kadUtils.convertPeerId(p7.id)
      expect(pdl.canAddKadId(kadId)).to.be.true()
    })

    it('returns true at capacity for a closer peer', async () => {
      const pdl = new PeerDistanceList(key, 2)
      await pdl.add(p3)
      await pdl.add(p2)

      // p6 sits between p3 and the furthest (p2), so it would enter the list
      const kadId = await kadUtils.convertPeerId(p6.id)
      expect(pdl.canAddKadId(kadId)).to.be.true()
    })

    it('returns false at capacity for a peer equal to the furthest', async () => {
      const pdl = new PeerDistanceList(key, 2)
      await pdl.add(p3)
      await pdl.add(p2)

      // p7 is the same distance as the furthest (p2) - equal is not closer
      const kadId = await kadUtils.convertPeerId(p7.id)
      expect(pdl.canAddKadId(kadId)).to.be.false()
    })

    it('returns false at capacity for a farther peer', async () => {
      const pdl = new PeerDistanceList(key, 2)
      await pdl.add(p1)
      await pdl.add(p4)

      // p6 is farther than the furthest (p4)
      const kadId = await kadUtils.convertPeerId(p6.id)
      expect(pdl.canAddKadId(kadId)).to.be.false()
    })
  })
})

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { BitwiseOrMerger } from '../../src/partial/bitwise-or-merger.js'
import { PartialMessageState } from '../../src/partial/partial-message-state.js'

describe('PartialMessageState', () => {
  const merger = new BitwiseOrMerger()
  const maxGroups = 3
  const groupTTLMs = 5000
  const sandbox = sinon.createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  function makeGroupID (id: number): Uint8Array {
    return new Uint8Array([id])
  }

  it('should track metadata for a group', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)
    const groupID = makeGroupID(1)
    const metadata = new Uint8Array([0b1010])

    state.updateMetadata(groupID, 'peer1', metadata)

    expect(state.size).to.equal(1)
    expect(state.hasGroup(groupID)).to.be.true()
    expect(state.getLocalMetadata(groupID)).to.deep.equal(new Uint8Array([0b1010]))
    expect(state.getPeerMetadata(groupID, 'peer1')).to.deep.equal(new Uint8Array([0b1010]))
  })

  it('should merge metadata from multiple peers', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)
    const groupID = makeGroupID(1)

    state.updateMetadata(groupID, 'peer1', new Uint8Array([0b1010]))
    state.updateMetadata(groupID, 'peer2', new Uint8Array([0b0101]))

    const local = state.getLocalMetadata(groupID)
    expect(local).to.deep.equal(new Uint8Array([0b1111]))

    // Each peer's individual metadata is tracked
    expect(state.getPeerMetadata(groupID, 'peer1')).to.deep.equal(new Uint8Array([0b1010]))
    expect(state.getPeerMetadata(groupID, 'peer2')).to.deep.equal(new Uint8Array([0b0101]))
  })

  it('should evict oldest group when at capacity', () => {
    sandbox.useFakeTimers()

    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    // Fill up to capacity
    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([1]))
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([2]))
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(3), 'peer1', new Uint8Array([3]))

    expect(state.size).to.equal(3)

    // Adding a 4th should evict the oldest (group 1)
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(4), 'peer1', new Uint8Array([4]))

    expect(state.size).to.equal(3)
    expect(state.hasGroup(makeGroupID(1))).to.be.false()
    expect(state.hasGroup(makeGroupID(2))).to.be.true()
    expect(state.hasGroup(makeGroupID(3))).to.be.true()
    expect(state.hasGroup(makeGroupID(4))).to.be.true()
  })

  it('should prune expired groups', () => {
    sandbox.useFakeTimers()

    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([1]))
    sandbox.clock.tick(1000)
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([2]))

    expect(state.size).to.equal(2)

    // Advance past TTL for group 1
    sandbox.clock.tick(groupTTLMs)

    const pruned = state.pruneExpired()
    expect(pruned).to.equal(1)
    expect(state.size).to.equal(1)
    expect(state.hasGroup(makeGroupID(1))).to.be.false()
    expect(state.hasGroup(makeGroupID(2))).to.be.true()
  })

  it('should remove a peer from all groups', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([0b1010]))
    state.updateMetadata(makeGroupID(1), 'peer2', new Uint8Array([0b0101]))
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([0b1100]))

    state.removePeer('peer1')

    expect(state.getPeerMetadata(makeGroupID(1), 'peer1')).to.be.undefined()
    expect(state.getPeerMetadata(makeGroupID(1), 'peer2')).to.deep.equal(new Uint8Array([0b0101]))
    expect(state.getPeerMetadata(makeGroupID(2), 'peer1')).to.be.undefined()
  })

  it('should return groups for gossip', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([0b1010]))
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([0b0101]))

    const gossipGroups = state.getGroupsForGossip()
    expect(gossipGroups.size).to.equal(2)
  })

  it('should clear all state', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([1]))
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([2]))

    state.clear()

    expect(state.size).to.equal(0)
    expect(state.hasGroup(makeGroupID(1))).to.be.false()
  })

  it('should return undefined for unknown group/peer', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    expect(state.getLocalMetadata(makeGroupID(99))).to.be.undefined()
    expect(state.getPeerMetadata(makeGroupID(99), 'peer1')).to.be.undefined()
    expect(state.hasGroup(makeGroupID(99))).to.be.false()
  })

  it('should replace peer metadata on second update for same group', () => {
    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)
    const groupID = makeGroupID(1)

    // First update
    state.updateMetadata(groupID, 'peer1', new Uint8Array([0b1010]))
    expect(state.getPeerMetadata(groupID, 'peer1')).to.deep.equal(new Uint8Array([0b1010]))

    // Second update from same peer, same group, different metadata
    state.updateMetadata(groupID, 'peer1', new Uint8Array([0b0101]))
    expect(state.getPeerMetadata(groupID, 'peer1')).to.deep.equal(new Uint8Array([0b0101]))

    // Local metadata is cumulative (bitwise OR of all received)
    // First 0b1010 | initial 0b0000 = 0b1010, then 0b1010 | 0b0101 = 0b1111
    expect(state.getLocalMetadata(groupID)).to.deep.equal(new Uint8Array([0b1111]))
  })

  it('should evict by access time not creation time (LRU)', () => {
    sandbox.useFakeTimers()

    const state = new PartialMessageState(merger, maxGroups, groupTTLMs)

    // Create groups 1, 2, 3 in order
    state.updateMetadata(makeGroupID(1), 'peer1', new Uint8Array([1]))
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(2), 'peer1', new Uint8Array([2]))
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(3), 'peer1', new Uint8Array([3]))

    // Access group 1 again, making group 2 the least-recently-accessed
    sandbox.clock.tick(10)
    state.getLocalMetadata(makeGroupID(1))

    // Adding group 4 should evict group 2 (least recently accessed), not group 1
    sandbox.clock.tick(10)
    state.updateMetadata(makeGroupID(4), 'peer1', new Uint8Array([4]))

    expect(state.size).to.equal(3)
    expect(state.hasGroup(makeGroupID(1))).to.be.true()
    expect(state.hasGroup(makeGroupID(2))).to.be.false()
    expect(state.hasGroup(makeGroupID(3))).to.be.true()
    expect(state.hasGroup(makeGroupID(4))).to.be.true()
  })
})

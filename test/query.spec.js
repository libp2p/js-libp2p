/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const pDefer = require('p-defer')
const delay = require('delay')
const Query = require('../src/query')
const kadUtils = require('../src/utils')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const createPeerId = require('./utils/create-peer-id')
const TestDHT = require('./utils/test-dht')
const createDisjointTracks = require('./utils/create-disjoint-tracks')

describe('Query', () => {
  let peerIds
  let tdht
  let dht

  before(async () => {
    peerIds = await createPeerId(40)
  })

  beforeEach(async () => {
    tdht = new TestDHT()
    ;[dht] = await tdht.spawn(1)
  })

  afterEach(() => {
    tdht.teardown()
  })

  it('simple run', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    let i = 0
    const queryFunc = async (p) => { // eslint-disable-line require-await
      if (i++ === 1) {
        expect(p.id).to.eql(peerIds[2].id)

        return {
          value: uint8ArrayFromString('cool'),
          pathComplete: true
        }
      }
      expect(p.id).to.eql(peerIds[1].id)
      return {
        closerPeers: [{ id: peerIds[2] }]
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1]])

    expect(res.paths[0].value).to.eql(uint8ArrayFromString('cool'))
    expect(res.paths[0].success).to.eql(true)
    expect(res.finalSet.size).to.eql(2)
  })

  it('does not return an error if only some queries error', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    let i = 0
    const visited = []
    const queryFunc = async (p) => { // eslint-disable-line require-await
      visited.push(p)

      if (i++ === 1) {
        throw new Error('fail')
      }

      return {
        closerPeers: [{ id: peerIds[2] }]
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1]])

    // Should have visited
    // - the initial peer passed to the query: peerIds[1]
    // - the peer returned in closerPeers: peerIds[2]
    expect(visited).to.eql([peerIds[1], peerIds[2]])

    // The final set should only contain peers that were successfully queried
    // (ie no errors)
    expect(res.finalSet.size).to.eql(1)
    expect(res.finalSet.has(peerIds[1])).to.equal(true)
  })

  it('returns an error if all queries error', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    const queryFunc = async (p) => { throw new Error('fail') } // eslint-disable-line require-await
    const q = new Query(dht, peerId.id, () => queryFunc)

    try {
      await q.run([peerIds[1]])
    } catch (err) {
      expect(err).to.exist()
      expect(err.message).to.eql('fail')
      return
    }

    throw new Error('should return an error if all queries error')
  })

  it('returns empty run if initial peer list is empty', async () => {
    const peerId = dht.peerId
    const queryFunc = async (p) => {}

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([])

    // Should not visit any peers
    expect(res.paths.length).to.eql(0)
    expect(res.finalSet.size).to.eql(0)
  })

  it('only closerPeers', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    const queryFunc = async (p) => { // eslint-disable-line require-await
      return {
        closerPeers: [{ id: peerIds[2] }]
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1]])

    expect(res.finalSet.size).to.eql(2)
  })

  it('only closerPeers concurrent', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    //  1 -> 8
    //  2 -> 4 -> 5
    //       6 -> 7
    //  3 -> 9 -> 10
    const topology = {
      [peerIds[1].toB58String()]: [
        { id: peerIds[8] }
      ],

      [peerIds[2].toB58String()]: [
        { id: peerIds[4] },
        { id: peerIds[6] }
      ],
      [peerIds[4].toB58String()]: [
        { id: peerIds[5] }
      ],
      [peerIds[6].toB58String()]: [
        { id: peerIds[7] }
      ],
      [peerIds[3].toB58String()]: [
        { id: peerIds[9] }
      ],
      [peerIds[9].toB58String()]: [
        { id: peerIds[10] }
      ]
    }

    const queryFunc = async (p) => { // eslint-disable-line require-await
      const closer = topology[p.toB58String()]
      return {
        closerPeers: closer || []
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1], peerIds[2], peerIds[3]])

    // Should visit all peers
    expect(res.finalSet.size).to.eql(10)
  })

  it('early success', async () => {
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    // 1 -> 2 -> 3 -> 4
    const topology = {
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      // Should stop here because pathComplete is true
      [peerIds[2].toB58String()]: {
        closer: [{ id: peerIds[3] }],
        pathComplete: true
      },
      // Should not reach here because previous query returns pathComplete
      [peerIds[3].toB58String()]: {
        closer: [{ id: peerIds[4] }]
      }
    }

    const queryFunc = async (p) => { // eslint-disable-line require-await
      const res = topology[p.toB58String()] || {}
      return {
        closerPeers: res.closer || [],
        value: res.value,
        pathComplete: res.pathComplete
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1]])

    // Should complete successfully
    expect(res.paths.length).to.eql(1)
    expect(res.paths[0].success).to.eql(true)

    // Should only visit peers up to the success peer
    expect(res.finalSet.size).to.eql(2)
  })

  it('all queries stop after shutdown', async () => {
    const deferShutdown = pDefer()
    const [dhtA] = await tdht.spawn(1)
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dhtA.dialer.dial = (peer) => {}

    // 1 -> 2 -> 3 -> 4
    const topology = {
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      [peerIds[2].toB58String()]: {
        closer: [{ id: peerIds[3] }]
      },
      // Should not reach here because query gets shut down
      [peerIds[3].toB58String()]: {
        closer: [{ id: peerIds[4] }]
      }
    }

    const visited = []
    const queryFunc = async (p) => {
      visited.push(p)

      const getResult = async () => {
        const res = topology[p.toB58String()] || {}
        // this timeout is necesary so `dhtA.stop` has time to stop the
        // requests before they all complete
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          closerPeers: res.closer || []
        }
      }

      // Shut down after visiting peerIds[2]
      if (p.toB58String() === peerIds[2].toB58String()) {
        dhtA.stop()
        setTimeout(checkExpectations, 100)
        return getResult()
      }
      return getResult()
    }

    const q = new Query(dhtA, peerId.id, () => queryFunc)
    await q.run([peerIds[1]])

    function checkExpectations () {
      // Should only visit peers up to the point where we shut down
      expect(visited).to.eql([peerIds[1], peerIds[2]])

      deferShutdown.resolve()
    }

    return deferShutdown.promise
  })

  it('queries run after shutdown return immediately', async () => {
    const [dhtA] = await tdht.spawn(1)
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dhtA.dialer.dial = (peer, callback) => callback()

    // 1 -> 2 -> 3
    const topology = {
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      [peerIds[2].toB58String()]: {
        closer: [{ id: peerIds[3] }]
      }
    }

    const queryFunc = async (p) => { // eslint-disable-line require-await
      const res = topology[p.toB58String()] || {}
      return {
        closerPeers: res.closer || []
      }
    }

    const q = new Query(dhtA, peerId.id, () => queryFunc)

    await dhtA.stop()
    const res = await q.run([peerIds[1]])

    // Should not visit any peers
    expect(res.paths.length).to.eql(0)
    expect(res.finalSet.size).to.eql(0)
  })

  it('disjoint path values', async () => {
    const peerId = dht.peerId
    const values = ['v0', 'v1'].map((str) => uint8ArrayFromString(str))

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    // 1 -> 2 -> 3 (v0)
    // 4 -> 5 (v1)
    const topology = {
      // Top level node
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      [peerIds[2].toB58String()]: {
        closer: [{ id: peerIds[3] }]
      },
      // v0
      [peerIds[3].toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerIds[4].toB58String()]: {
        closer: [{ id: peerIds[5] }]
      },
      // v1
      [peerIds[5].toB58String()]: {
        value: values[1],
        pathComplete: true
      }
    }

    const queryFunc = async (p) => {
      const res = topology[p.toB58String()] || {}
      await new Promise(resolve => setTimeout(resolve, res.delay))
      return {
        closerPeers: res.closer || [],
        value: res.value,
        pathComplete: res.pathComplete
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1], peerIds[4]])

    // We should get back the values from both paths
    expect(res.paths.length).to.eql(2)
    expect(res.paths[0].value).to.eql(values[0])
    expect(res.paths[0].success).to.eql(true)
    expect(res.paths[1].value).to.eql(values[1])
    expect(res.paths[1].success).to.eql(true)
  })

  it('disjoint path values with early completion', async () => {
    const peerId = dht.peerId
    const values = ['v0', 'v1'].map((str) => uint8ArrayFromString(str))

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    // 1 -> 2 (delay) -> 3
    // 4 -> 5 [query complete]
    const topology = {
      // Top level node
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      // This query has a delay which means it only returns after the other
      // path has already indicated the query is complete, so its result
      // should be ignored
      [peerIds[2].toB58String()]: {
        delay: 100,
        closer: [{ id: peerIds[3] }]
      },
      // Query has stopped by the time we reach here, should be ignored
      [peerIds[3].toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerIds[4].toB58String()]: {
        closer: [{ id: peerIds[5] }]
      },
      // This peer indicates that the query is complete
      [peerIds[5].toB58String()]: {
        closer: [{ id: peerIds[2] }],
        value: values[1],
        queryComplete: true
      }
    }

    const visited = []
    const queryFunc = async (p) => {
      visited.push(p)

      const res = topology[p.toB58String()] || {}
      await delay(res.delay)
      return {
        closerPeers: res.closer || [],
        value: res.value,
        pathComplete: res.pathComplete,
        queryComplete: res.queryComplete
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1], peerIds[4]])

    // We should only get back the value from the path 4 -> 5
    expect(res.paths.length).to.eql(1)
    expect(res.paths[0].value).to.eql(values[1])
    expect(res.paths[0].success).to.eql(true)

    // Wait a little bit to make sure we don't continue down another path
    // after finding a successful path
    await delay(300)
    if (visited.indexOf(peerIds[3]) !== -1) {
      expect.fail('Query continued after success was returned')
    }
  })

  it('disjoint path continue other paths after error on one path', async () => {
    const peerId = dht.peerId
    const values = ['v0', 'v1'].map((str) => uint8ArrayFromString(str))

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    // 1 -> 2 (delay) -> 3 [pathComplete]
    // 4 -> 5 [error] -> 6
    const topology = {
      // Top level node
      [peerIds[1].toB58String()]: {
        closer: [{ id: peerIds[2] }]
      },
      // This query has a delay which means it only returns after the other
      // path has already returned an error
      [peerIds[2].toB58String()]: {
        delay: 100,
        closer: [{ id: peerIds[3] }]
      },
      // Success peer, should get this value back at the end
      [peerIds[3].toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerIds[4].toB58String()]: {
        closer: [{ id: peerIds[5] }]
      },
      // Return an error at this point
      [peerIds[5].toB58String()]: {
        closer: [{ id: peerIds[6] }],
        error: true
      },
      // Should never reach here
      [peerIds[6].toB58String()]: {
        value: values[1],
        pathComplete: true
      }
    }

    const visited = []
    const queryFunc = async (p) => {
      visited.push(p)

      const res = topology[p.toB58String()] || {}
      await new Promise(resolve => setTimeout(resolve, res.delay))
      if (res.error) {
        throw new Error('path error')
      }
      return {
        closerPeers: res.closer || [],
        value: res.value,
        pathComplete: res.pathComplete
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    const res = await q.run([peerIds[1], peerIds[4]])

    // We should only get back the value from the path 1 -> 2 -> 3
    expect(res.paths.length).to.eql(1)
    expect(res.paths[0].value).to.eql(values[0])
    expect(res.paths[0].success).to.eql(true)
  })

  it('stop after finding k closest peers', async () => {
    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    // Sort peers by distance from dht.peerId
    const peerZeroDhtKey = await kadUtils.convertPeerId(dht.peerId)
    const sorted = await kadUtils.sortClosestPeers(peerIds, peerZeroDhtKey)

    // Local node has nodes 10, 16 and 18 in k-bucket
    const initial = [sorted[10], sorted[16], sorted[18]]

    // Should zoom in to peers near target, and then zoom out again until it
    // has successfully queried 20 peers
    const topology = {
      // Local node has nodes 10, 16 and 18 in k-bucket
      10: [12, 20, 22, 24, 26, 28],
      16: [14, 18, 20, 22, 24, 26],
      18: [4, 6, 8, 12, 14, 16],

      26: [24, 28, 30, 38],
      30: [14, 28],
      38: [2],

      // Should zoom out from this point, until it has 20 peers
      2: [13],
      13: [15],
      15: [17],

      // Right before we get to 20 peers, it finds some new peers that are
      // closer than some of the ones it has already queried
      17: [1, 3, 5, 11],
      1: [7, 9],
      9: [19],

      // At this point it's visited 20 (actually more than 20 peers), and
      // there are no closer peers to be found, so it should stop querying.
      // Because there are 3 paths, each with a worker queue with
      // concurrency 3, the exact order in which peers are visited is
      // unpredictable, so we add a long tail and below we test to make
      // sure that it never reaches the end of the tail.
      19: [21],
      21: [23],
      23: [25],
      25: [27],
      27: [29],
      29: [31]
    }

    const peerIndex = (peerId) => sorted.findIndex(p => p === peerId)
    const peerIdToPeerData = (peerId) => peerIds.find(pi => pi === peerId)

    const visited = []
    const queryFunc = async (peerId) => { // eslint-disable-line require-await
      visited.push(peerId)
      const i = peerIndex(peerId)
      const closerIndexes = topology[i] || []
      const closerPeers = closerIndexes.map(j => peerIdToPeerData(sorted[j])).map((p) => ({ id: p }))
      return { closerPeers }
    }

    const q = new Query(dht, dht.peerId.id, () => queryFunc)
    const res = await q.run(initial)

    // Should query 19 peers, then find some peers closer to the key, and
    // finally stop once those closer peers have been queried
    const expectedVisited = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 38])
    const visitedSet = new Set(visited.map(peerIndex))
    for (const i of expectedVisited) {
      expect(visitedSet.has(i))
    }

    // Should never get to end of tail (see note above)
    expect(visited.find(p => peerIndex(p) === 29)).not.to.exist()

    // Final set should have 20 peers, and the closer peers that were
    // found near the end of the query should displace further away
    // peers that were found at the beginning
    expect(res.finalSet.size).to.eql(20)
    expect(res.finalSet.has(sorted[1])).to.eql(true)
    expect(res.finalSet.has(sorted[3])).to.eql(true)
    expect(res.finalSet.has(sorted[5])).to.eql(true)
    expect(res.finalSet.has(sorted[38])).to.eql(false)
  })

  /*
   * This test creates two disjoint tracks of peers, one for
   * each of the query's two paths to follow. The "good"
   * track that leads to the target initially has high
   * distances to the target, while the "bad" track that
   * goes nowhere has small distances to the target.
   * Only by going down both simultaneously will it find
   * the target before the end of the bad track. The greedy
   * behavior without disjoint paths would reach the target
   * only after visiting every single peer.
   *
   *                 xor distance to target
   * far <-----------------------------------------------> close
   * <us>
   *     <good 0> <g 1> <g 2>                            <target>
   *                           <bad 0> <b 1> ... <b n>
   *
   */
  it('uses disjoint paths', async () => {
    const goodLength = 3
    const samplePeerIds = peerIds.slice(0, 12)
    const {
      targetId,
      starts,
      getResponse
    } = await createDisjointTracks(samplePeerIds, goodLength)

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}
    let badEndVisited = false
    let targetVisited = false

    const q = new Query(dht, targetId.id, (trackNum) => {
      return async (p) => { // eslint-disable-line require-await
        const response = getResponse(p, trackNum)
        expect(response).to.exist() // or we aren't on the right track
        if (response.end && !response.pathComplete) {
          badEndVisited = true
        }
        if (response.pathComplete) {
          targetVisited = true
          expect(badEndVisited).to.eql(false)
        }
        return response
      }
    })
    q.concurrency = 1
    const res = await q.run(starts)
    // we should reach the target node
    expect(targetVisited).to.eql(true)
    // we should visit all nodes (except the target)
    expect(res.finalSet.size).to.eql(samplePeerIds.length - 1)
    // there should be one successful path
    expect(res.paths.length).to.eql(1)
  })

  it('should discover closer peers', () => {
    const discoverDefer = pDefer()
    const peerId = dht.peerId

    // mock this so we can dial non existing peers
    dht.dialer.dial = () => {}

    const queryFunc = async (p) => { // eslint-disable-line require-await
      return {
        closerPeers: [{ id: peerIds[2] }]
      }
    }

    const q = new Query(dht, peerId.id, () => queryFunc)
    q.run([peerIds[1]])

    dht.once('peer', (peerData) => {
      expect(peerData.id).to.eql(peerIds[2])
      discoverDefer.resolve()
    })

    return discoverDefer.promise
  })
})

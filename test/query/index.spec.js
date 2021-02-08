/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const sinon = require('sinon')
const delay = require('delay')
const PeerStore = require('libp2p/src/peer-store')
const Query = require('../../src/query')
const Path = require('../../src/query/path')
const Run = require('../../src/query/run')
const DHT = require('../../src')
const c = require('../../src/constants')
const createPeerId = require('../utils/create-peer-id')
const { sortClosestPeers } = require('../../src/utils')
const { convertBuffer } = require('../../src/utils')
const uint8ArrayFromString = require('uint8arrays/from-string')
const NUM_IDS = 101

describe('Query', () => {
  let peerIds
  let ourPeerId
  before(async () => {
    const peers = await createPeerId(NUM_IDS)

    ourPeerId = peers.shift()
    peerIds = peers
  })

  describe('get closest peers', () => {
    const targetKey = {
      key: uint8ArrayFromString('A key to find'),
      dhtKey: null
    }
    let sortedPeers
    let dht

    before('get sorted peers', async () => {
      const dhtKey = await convertBuffer(targetKey.key)
      targetKey.dhtKey = dhtKey

      sortedPeers = await sortClosestPeers(peerIds, targetKey.dhtKey)
    })

    before('create a dht', () => {
      const peerStore = new PeerStore({ peerId: ourPeerId })
      dht = new DHT({
        dialer: {},
        peerStore,
        peerId: ourPeerId
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should end paths when they have no closer peers to whats already been queried', async () => {
      const PATHS = 5
      sinon.stub(dht, 'disjointPaths').value(PATHS)
      sinon.stub(dht._queryManager, 'running').value(true)
      const querySpy = sinon.stub().resolves({})

      const query = new Query(dht, targetKey.key, () => querySpy)

      const run = new Run(query)
      await run.init()

      // Add the sorted peers into 5 paths. This will weight
      // the paths with increasingly further peers
      const sortedPeerIds = sortedPeers
      const peersPerPath = sortedPeerIds.length / PATHS
      const paths = [...new Array(PATHS)].map((_, index) => {
        const path = new Path(run, query.makePath())
        const start = index * peersPerPath
        const peers = sortedPeerIds.slice(start, start + peersPerPath)
        peers.forEach(p => path.addInitialPeer(p))
        return path
      })

      // Get the peers of the 2nd closest path, and remove the path
      // We don't want to execute it. Just add its peers to peers we've
      // already queried.
      const queriedPeers = paths.splice(1, 1)[0].initialPeers
      await Promise.all(queriedPeers.map((peerId) => run.peersQueried.add(peerId)))

      const continueSpy = sinon.spy(run, 'continueQuerying')

      await run.executePaths(paths)

      // The resulting peers should all be from path 0 as it had the closest
      expect(run.peersQueried.peers).to.eql(paths[0].initialPeers)

      // Continue should be called on all `peersPerPath` queries of the first path,
      // plus ALPHA (concurrency) of the other 3 paths
      expect(continueSpy.callCount).to.eql(peersPerPath + (3 * c.ALPHA))

      // The query should ONLY have been called on path 0 as it
      // was the only path to contain closer peers that what we
      // pre populated `run.peersQueried` with
      expect(querySpy.callCount).to.eql(peersPerPath)
      const finalQueriedPeers = querySpy.getCalls().map(call => call.args[0])
      expect(finalQueriedPeers).to.eql(paths[0].initialPeers)
    })

    it('should continue querying if the path has a closer peer', async () => {
      sinon.stub(dht, 'disjointPaths').value(1)
      sinon.stub(dht._queryManager, 'running').value(true)

      const querySpy = sinon.stub().resolves({})
      const query = new Query(dht, targetKey.key, () => querySpy)

      const run = new Run(query)

      await run.init()

      const sortedPeerIds = sortedPeers

      // Take the top 15 peers and peers 20 - 25 to seed `run.peersQueried`
      // This leaves us with only 16 - 19 as closer peers
      const queriedPeers = [
        ...sortedPeerIds.slice(0, 15),
        ...sortedPeerIds.slice(20, 25)
      ]

      const path = new Path(run, query.makePath())
      // Give the path a closet peer and 15 further peers
      const pathPeers = [
        ...sortedPeerIds.slice(15, 16), // 1 closer
        ...sortedPeerIds.slice(80, 95)
      ]

      pathPeers.forEach(p => path.addInitialPeer(p))
      const returnPeers = sortedPeers.slice(16, 20)
      // When the second query happens, which is a further peer,
      // return peers 16 - 19
      querySpy.onCall(1).callsFake(async () => {
        // this delay ensures the queries finish in serial
        // see https://github.com/libp2p/js-libp2p-kad-dht/pull/121#discussion_r286437978
        await delay(10)
        return { closerPeers: returnPeers }
      })

      await Promise.all(queriedPeers.map((peerId) => run.peersQueried.add(peerId)))

      await run.executePaths([path])

      // Querying will stop after the first ALPHA peers are queried
      expect(querySpy.callCount).to.eql(c.ALPHA)

      // We'll only get the 1 closest peer from `pathPeers`.
      // The worker will be stopped before the `returnedPeers`
      // are processed and queried.
      expect(run.peersQueried.peers).to.eql([
        ...sortedPeerIds.slice(0, 16),
        ...sortedPeerIds.slice(20, 24)
      ])
    })
  })
})

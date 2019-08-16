/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const sinon = require('sinon')
const each = require('async/each')
const PeerBook = require('peer-book')
const promiseToCallback = require('promise-to-callback')

const Query = require('../../src/query')
const Path = require('../../src/query/path')
const Run = require('../../src/query/run')
const DHT = require('../../src')
const c = require('../../src/constants')
const createPeerInfo = require('../utils/create-peer-info')
const { sortClosestPeerInfos } = require('../utils')
const { convertBuffer } = require('../../src/utils')
const NUM_IDS = 101

describe('Query', () => {
  let peerInfos
  let ourPeerInfo
  before((done) => {
    createPeerInfo(NUM_IDS, (err, peers) => {
      ourPeerInfo = peers.shift()
      peerInfos = peers
      done(err)
    })
  })

  describe('get closest peers', () => {
    const targetKey = {
      key: Buffer.from('A key to find'),
      dhtKey: null
    }
    let sortedPeers
    let dht

    before('get sorted peers', (done) => {
      convertBuffer(targetKey.key, (err, dhtKey) => {
        if (err) return done(err)
        targetKey.dhtKey = dhtKey

        sortClosestPeerInfos(peerInfos, targetKey.dhtKey, (err, peers) => {
          sortedPeers = peers
          done(err)
        })
      })
    })

    before('create a dht', () => {
      dht = new DHT({
        _peerInfo: ourPeerInfo,
        _peerBook: new PeerBook()
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should end paths when they have no closer peers to whats already been queried', (done) => {
      const PATHS = 5
      sinon.stub(dht, 'disjointPaths').value(PATHS)
      sinon.stub(dht._queryManager, 'running').value(true)
      const querySpy = sinon.stub().resolves({})

      const query = new Query(dht, targetKey.key, () => querySpy)

      const run = new Run(query)
      promiseToCallback(run.init())(() => {
        // Add the sorted peers into 5 paths. This will weight
        // the paths with increasingly further peers
        const sortedPeerIds = sortedPeers.map(peerInfo => peerInfo.id)
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
        each(queriedPeers, (peerId, cb) => {
          run.peersQueried.add(peerId, cb)
        }, (err) => {
          if (err) return done(err)

          const continueSpy = sinon.spy(run, 'continueQuerying')

          // Run the 4 paths
          promiseToCallback(run.executePaths(paths))((err) => {
            expect(err).to.not.exist()
            // The resulting peers should all be from path 0 as it had the closest
            expect(run.peersQueried.peers).to.eql(paths[0].initialPeers)

            // Continue should be called on all `peersPerPath` queries of the first path,
            // plus ALPHA (concurrency) of the other 3 paths
            expect(continueSpy.callCount).to.eql(peersPerPath + (3 * c.ALPHA))

            // The query should ONLY have been called on path 0 as it
            // was the only path to contain closer peers that what we
            // pre populated `run.peersQueried` with
            expect(querySpy.callCount).to.eql(peersPerPath)
            const queriedPeers = querySpy.getCalls().map(call => call.args[0])
            expect(queriedPeers).to.eql(paths[0].initialPeers)
            done()
          })
        })
      })
    })

    it('should continue querying if the path has a closer peer', (done) => {
      sinon.stub(dht, 'disjointPaths').value(1)
      sinon.stub(dht._queryManager, 'running').value(true)

      const querySpy = sinon.stub().resolves({})
      const query = new Query(dht, targetKey.key, () => querySpy)

      const run = new Run(query)
      promiseToCallback(run.init())(() => {
        const sortedPeerIds = sortedPeers.map(peerInfo => peerInfo.id)

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
          // this timeout ensures the queries finish in serial
          // see https://github.com/libp2p/js-libp2p-kad-dht/pull/121#discussion_r286437978
          await new Promise(resolve => setTimeout(resolve, 10))
          return { closerPeers: returnPeers }
        })

        each(queriedPeers, (peerId, cb) => {
          run.peersQueried.add(peerId, cb)
        }, (err) => {
          if (err) return done(err)

          // Run the path
          promiseToCallback(run.executePaths([path]))((err) => {
            expect(err).to.not.exist()

            // Querying will stop after the first ALPHA peers are queried
            expect(querySpy.callCount).to.eql(c.ALPHA)

            // We'll only get the 1 closest peer from `pathPeers`.
            // The worker will be stopped before the `returnedPeers`
            // are processed and queried.
            expect(run.peersQueried.peers).to.eql([
              ...sortedPeerIds.slice(0, 16),
              ...sortedPeerIds.slice(20, 24)
            ])
            done()
          })
        })
      })
    })
  })
})

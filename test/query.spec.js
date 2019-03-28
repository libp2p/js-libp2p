/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const setImmediate = require('async/setImmediate')

const DHT = require('../src')
const Query = require('../src/query')

const createPeerInfo = require('./utils/create-peer-info')
const createDisjointTracks = require('./utils/create-disjoint-tracks')

describe('Query', () => {
  let peerInfos
  let dht

  before(function (done) {
    this.timeout(5 * 1000)
    createPeerInfo(12, (err, result) => {
      if (err) {
        return done(err)
      }

      peerInfos = result
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      dht = new DHT(sw)

      done()
    })
  })

  it('simple run', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    let i = 0
    const query = (p, cb) => {
      if (i++ === 1) {
        expect(p.id).to.eql(peerInfos[2].id.id)

        return cb(null, {
          value: Buffer.from('cool'),
          pathComplete: true
        })
      }
      expect(p.id).to.eql(peerInfos[1].id.id)
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.paths[0].value).to.eql(Buffer.from('cool'))
      expect(res.paths[0].success).to.eql(true)
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  it('does not return an error if only some queries error', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    let i = 0
    const query = (p, cb) => {
      if (i++ === 1) {
        return cb(new Error('fail'))
      }
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).not.to.exist()

      // Should have visited
      // - the initial peer passed to the query: peerInfos[1]
      // - the peer returned in closerPeers: peerInfos[2]
      expect(res.finalSet.size).to.eql(2)
      expect(res.finalSet.has(peerInfos[1].id)).to.equal(true)
      expect(res.finalSet.has(peerInfos[2].id)).to.equal(true)

      done()
    })
  })

  it('returns an error if all queries error', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    const query = (p, cb) => cb(new Error('fail'))

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.exist()
      expect(err.message).to.eql('fail')
      done()
    })
  })

  it('only closerPeers', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    const query = (p, cb) => {
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  it('only closerPeers concurrent', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    //  1 -> 8
    //  2 -> 4 -> 5
    //       6 -> 7
    //  3 -> 9 -> 10
    const topology = {
      [peerInfos[1].id.toB58String()]: [
        peerInfos[8]
      ],

      [peerInfos[2].id.toB58String()]: [
        peerInfos[4],
        peerInfos[6]
      ],
      [peerInfos[4].id.toB58String()]: [
        peerInfos[5]
      ],
      [peerInfos[6].id.toB58String()]: [
        peerInfos[7]
      ],

      [peerInfos[3].id.toB58String()]: [
        peerInfos[9]
      ],
      [peerInfos[9].id.toB58String()]: [
        peerInfos[10]
      ]
    }

    const query = (p, cb) => {
      const closer = topology[p.toB58String()]
      cb(null, {
        closerPeers: closer || []
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id, peerInfos[2].id, peerInfos[3].id], (err, res) => {
      expect(err).to.not.exist()

      // Should visit all peers
      expect(res.finalSet.size).to.eql(10)
      done()
    })
  })

  it('early success', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    // 1 -> 2 -> 3 -> 4
    const topology = {
      [peerInfos[1].id.toB58String()]: {
        closer: [peerInfos[2]]
      },
      // Should stop here because pathComplete is true
      [peerInfos[2].id.toB58String()]: {
        closer: [peerInfos[3]],
        pathComplete: true
      },
      // Should not reach here because previous query returns pathComplete
      [peerInfos[3].id.toB58String()]: {
        closer: [peerInfos[4]]
      }
    }

    const query = (p, cb) => {
      const res = topology[p.toB58String()] || {}
      cb(null, {
        closerPeers: res.closer || [],
        value: res.value,
        pathComplete: res.pathComplete
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()

      // Should complete successfully
      expect(res.paths.length).to.eql(1)
      expect(res.paths[0].success).to.eql(true)

      // Should only visit peers up to the success peer
      expect(res.finalSet.size).to.eql(2)

      done()
    })
  })

  it('disjoint path values', (done) => {
    const peer = peerInfos[0]
    const values = ['v0', 'v1'].map(Buffer.from)

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    // 1 -> 2 -> 3 (v0)
    // 4 -> 5 (v1)
    const topology = {
      // Top level node
      [peerInfos[1].id.toB58String()]: {
        closer: [peerInfos[2]]
      },
      [peerInfos[2].id.toB58String()]: {
        closer: [peerInfos[3]]
      },
      // v0
      [peerInfos[3].id.toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerInfos[4].id.toB58String()]: {
        closer: [peerInfos[5]]
      },
      // v1
      [peerInfos[5].id.toB58String()]: {
        value: values[1],
        pathComplete: true
      }
    }

    const query = (p, cb) => {
      const res = topology[p.toB58String()] || {}
      setTimeout(() => {
        cb(null, {
          closerPeers: res.closer || [],
          value: res.value,
          pathComplete: res.pathComplete
        })
      }, res.delay)
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id, peerInfos[4].id], (err, res) => {
      expect(err).to.not.exist()

      // We should get back the values from both paths
      expect(res.paths.length).to.eql(2)
      expect(res.paths[0].value).to.eql(values[0])
      expect(res.paths[0].success).to.eql(true)
      expect(res.paths[1].value).to.eql(values[1])
      expect(res.paths[1].success).to.eql(true)

      done()
    })
  })

  it('disjoint path values with early completion', (done) => {
    const peer = peerInfos[0]
    const values = ['v0', 'v1'].map(Buffer.from)

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    // 1 -> 2 (delay) -> 3
    // 4 -> 5 [query complete]
    const topology = {
      // Top level node
      [peerInfos[1].id.toB58String()]: {
        closer: [peerInfos[2]]
      },
      // This query has a delay which means it only returns after the other
      // path has already indicated the query is complete, so its result
      // should be ignored
      [peerInfos[2].id.toB58String()]: {
        delay: 100,
        closer: [peerInfos[3]]
      },
      // Query has stopped by the time we reach here, should be ignored
      [peerInfos[3].id.toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerInfos[4].id.toB58String()]: {
        closer: [peerInfos[5]]
      },
      // This peer indicates that the query is complete
      [peerInfos[5].id.toB58String()]: {
        closer: [peerInfos[2]],
        value: values[1],
        queryComplete: true
      }
    }

    const visited = []
    const query = (p, cb) => {
      visited.push(p)

      const res = topology[p.toB58String()] || {}
      setTimeout(() => {
        cb(null, {
          closerPeers: res.closer || [],
          value: res.value,
          pathComplete: res.pathComplete,
          queryComplete: res.queryComplete
        })
      }, res.delay)
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id, peerInfos[4].id], (err, res) => {
      expect(err).to.not.exist()

      // We should only get back the value from the path 4 -> 5
      expect(res.paths.length).to.eql(1)
      expect(res.paths[0].value).to.eql(values[1])
      expect(res.paths[0].success).to.eql(true)

      // Wait a little bit to make sure we don't continue down another path
      // after finding a successful path
      setTimeout(() => {
        if (visited.indexOf(peerInfos[3].id) !== -1) {
          expect.fail('Query continued after success was returned')
        }
        done()
      }, 300)
    })
  })

  it('disjoint path continue other paths after error on one path', (done) => {
    const peer = peerInfos[0]
    const values = ['v0', 'v1'].map(Buffer.from)

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    // 1 -> 2 (delay) -> 3 [pathComplete]
    // 4 -> 5 [error] -> 6
    const topology = {
      // Top level node
      [peerInfos[1].id.toB58String()]: {
        closer: [peerInfos[2]]
      },
      // This query has a delay which means it only returns after the other
      // path has already returned an error
      [peerInfos[2].id.toB58String()]: {
        delay: 100,
        closer: [peerInfos[3]]
      },
      // Success peer, should get this value back at the end
      [peerInfos[3].id.toB58String()]: {
        value: values[0],
        pathComplete: true
      },

      // Top level node
      [peerInfos[4].id.toB58String()]: {
        closer: [peerInfos[5]]
      },
      // Return an error at this point
      [peerInfos[5].id.toB58String()]: {
        closer: [peerInfos[6]],
        error: true
      },
      // Should never reach here
      [peerInfos[6].id.toB58String()]: {
        value: values[1],
        pathComplete: true
      }
    }

    const visited = []
    const query = (p, cb) => {
      visited.push(p)

      const res = topology[p.toB58String()] || {}
      setTimeout(() => {
        if (res.error) {
          return cb(new Error('path error'))
        }
        cb(null, {
          closerPeers: res.closer || [],
          value: res.value,
          pathComplete: res.pathComplete
        })
      }, res.delay)
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id, peerInfos[4].id], (err, res) => {
      expect(err).to.not.exist()

      // We should only get back the value from the path 1 -> 2 -> 3
      expect(res.paths.length).to.eql(1)
      expect(res.paths[0].value).to.eql(values[0])
      expect(res.paths[0].success).to.eql(true)

      done()
    })
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
  it('uses disjoint paths', (done) => {
    const goodLength = 3
    createDisjointTracks(peerInfos, goodLength, (err, targetId, starts, getResponse) => {
      expect(err).to.not.exist()
      // mock this so we can dial non existing peers
      dht.switch.dial = (peer, callback) => callback()
      let badEndVisited = false
      let targetVisited = false

      const q = new Query(dht, targetId, (trackNum) => {
        return (p, cb) => {
          const response = getResponse(p, trackNum)
          expect(response).to.exist() // or we aren't on the right track
          if (response.end && !response.pathComplete) {
            badEndVisited = true
          }
          if (response.pathComplete) {
            targetVisited = true
            expect(badEndVisited).to.eql(false)
          }
          setImmediate(() => cb(null, response))
        }
      })
      q.concurrency = 1
      // due to round-robin allocation of peers from starts, first
      // path is good, second bad
      q.run(starts, (err, res) => {
        expect(err).to.not.exist()
        // we should reach the target node
        expect(targetVisited).to.eql(true)
        // we should visit all nodes (except the target)
        expect(res.finalSet.size).to.eql(peerInfos.length - 1)
        // there should be one successful path
        expect(res.paths.length).to.eql(1)
        done()
      })
    })
  })

  it('should discover closer peers', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    const query = (p, cb) => {
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
    })

    dht.once('peer', (peerInfo) => {
      expect(peerInfo.id).to.eql(peerInfos[2].id)
      done()
    })
  })
})

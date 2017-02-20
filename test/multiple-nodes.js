/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const expect = require('chai').expect
const parallel = require('async/parallel')

const FloodSub = require('../src')
const utils = require('./utils')
const first = utils.first
const createNode = utils.createNode
const expectSet = utils.expectSet

describe('multiple nodes (more than 2)', () => {
  describe('every peer subscribes to the topic', () => {
    describe('line', () => {
      // line
      // ◉────◉────◉
      // a    b    c
      let a
      let b
      let c

      before((done) => {
        parallel([
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb)
        ], (err, nodes) => {
          if (err) {
            return done(err)
          }
          a = nodes[0]
          b = nodes[1]
          c = nodes[2]

          done()
        })
      })

      after((done) => {
        // note: setTimeout to avoid the tests finishing
        // before swarm does its dials
        setTimeout(() => {
          parallel([
            (cb) => a.libp2p.stop(cb),
            (cb) => b.libp2p.stop(cb),
            (cb) => c.libp2p.stop(cb)
          ], done)
        }, 1000)
      })

      it('establish the connections', (done) => {
        parallel([
          (cb) => {
            a.libp2p.dialByPeerInfo(b.libp2p.peerInfo, cb)
          },
          (cb) => {
            b.libp2p.dialByPeerInfo(c.libp2p.peerInfo, cb)
          }
        ], (err) => {
          expect(err).to.not.exist
          // wait for the pubsub pipes to be established
          setTimeout(done, 200)
        })
      })

      it('subscribe to the topic on node a', (done) => {
        a.ps.subscribe('Z')
        expectSet(a.ps.subscriptions, ['Z'])

        setTimeout(() => {
          expect(b.ps.peers.size).to.equal(2)
          const topics = Array.from(b.ps.peers.values())[1].topics
          expectSet(topics, ['Z'])

          expect(c.ps.peers.size).to.equal(1)
          expectSet(first(c.ps.peers).topics, [])

          done()
        }, 200)
      })

      it('subscribe to the topic on node b', (done) => {
        b.ps.subscribe('Z')
        expectSet(b.ps.subscriptions, ['Z'])

        setTimeout(() => {
          expect(a.ps.peers.size).to.equal(1)
          expectSet(first(a.ps.peers).topics, ['Z'])

          expect(c.ps.peers.size).to.equal(1)
          expectSet(first(c.ps.peers).topics, ['Z'])

          done()
        }, 200)
      })

      it('subscribe to the topic on node c', (done) => {
        c.ps.subscribe('Z')
        expectSet(c.ps.subscriptions, ['Z'])

        setTimeout(() => {
          expect(a.ps.peers.size).to.equal(1)
          expectSet(first(a.ps.peers).topics, ['Z'])

          expect(b.ps.peers.size).to.equal(2)
          b.ps.peers.forEach((peer) => {
            expectSet(peer.topics, ['Z'])
          })

          done()
        }, 200)
      })

      it('publish on node a', (done) => {
        let counter = 0

        a.ps.on('Z', incMsg)
        b.ps.on('Z', incMsg)
        c.ps.on('Z', incMsg)

        a.ps.publish('Z', new Buffer('hey'))

        function incMsg (msg) {
          expect(msg.data.toString()).to.equal('hey')
          check()
        }

        function check () {
          if (++counter === 3) {
            a.ps.removeListener('Z', incMsg)
            b.ps.removeListener('Z', incMsg)
            c.ps.removeListener('Z', incMsg)
            done()
          }
        }
      })

      // since the topology is the same, just the publish
      // gets sent by other peer, we reused the same peers
      describe('1 level tree', () => {
        // 1 level tree
        //     ┌◉┐
        //     │b│
        //   ◉─┘ └─◉
        //   a     c

        it('publish on node b', (done) => {
          let counter = 0

          a.ps.on('Z', incMsg)
          b.ps.on('Z', incMsg)
          c.ps.on('Z', incMsg)

          b.ps.publish('Z', new Buffer('hey'))

          function incMsg (msg) {
            expect(msg.data.toString()).to.equal('hey')
            check()
          }

          function check () {
            if (++counter === 3) {
              a.ps.removeListener('Z', incMsg)
              b.ps.removeListener('Z', incMsg)
              c.ps.removeListener('Z', incMsg)
              done()
            }
          }
        })
      })
    })

    describe('2 level tree', () => {
      // 2 levels tree
      //      ┌◉┐
      //      │c│
      //   ┌◉─┘ └─◉┐
      //   │b     d│
      // ◉─┘       └─◉
      // a           e

      let a
      let b
      let c
      let d
      let e

      before((done) => {
        parallel([
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb),
          (cb) => spawnPubSubNode(cb)
        ], (err, nodes) => {
          if (err) {
            return done(err)
          }
          a = nodes[0]
          b = nodes[1]
          c = nodes[2]
          d = nodes[3]
          e = nodes[4]

          done()
        })
      })

      after((done) => {
        // note: setTimeout to avoid the tests finishing
        // before swarm does its dials
        setTimeout(() => {
          parallel([
            (cb) => a.libp2p.stop(cb),
            (cb) => b.libp2p.stop(cb),
            (cb) => c.libp2p.stop(cb),
            (cb) => d.libp2p.stop(cb),
            (cb) => e.libp2p.stop(cb)
          ], done)
        }, 1000)
      })

      it('establish the connections', (done) => {
        parallel([
          (cb) => {
            a.libp2p.dialByPeerInfo(b.libp2p.peerInfo, cb)
          },
          (cb) => {
            b.libp2p.dialByPeerInfo(c.libp2p.peerInfo, cb)
          },
          (cb) => {
            c.libp2p.dialByPeerInfo(d.libp2p.peerInfo, cb)
          },
          (cb) => {
            d.libp2p.dialByPeerInfo(e.libp2p.peerInfo, cb)
          }
        ], (err) => {
          expect(err).to.not.exist
          // wait for the pubsub pipes to be established
          setTimeout(done, 2000)
        })
      })

      it('subscribes', () => {
        a.ps.subscribe('Z')
        expectSet(a.ps.subscriptions, ['Z'])
        b.ps.subscribe('Z')
        expectSet(b.ps.subscriptions, ['Z'])
        c.ps.subscribe('Z')
        expectSet(c.ps.subscriptions, ['Z'])
        d.ps.subscribe('Z')
        expectSet(d.ps.subscriptions, ['Z'])
        e.ps.subscribe('Z')
        expectSet(e.ps.subscriptions, ['Z'])
      })

      it('publishes from c', (done) => {
        let counter = 0

        a.ps.on('Z', incMsg)
        b.ps.on('Z', incMsg)
        c.ps.on('Z', incMsg)
        d.ps.on('Z', incMsg)
        e.ps.on('Z', incMsg)

        c.ps.publish('Z', new Buffer('hey from c'))

        function incMsg (msg) {
          expect(msg.data.toString()).to.equal('hey from c')
          check()
        }

        function check () {
          if (++counter === 5) {
            a.ps.removeListener('Z', incMsg)
            b.ps.removeListener('Z', incMsg)
            c.ps.removeListener('Z', incMsg)
            d.ps.removeListener('Z', incMsg)
            e.ps.removeListener('Z', incMsg)
            done()
          }
        }
      })
    })
  })

  describe('only some nodes subscribe the networks', () => {
    describe('line', () => {
      // line
      // ◉────◎────◉
      // a    b    c

      before((done) => {
      })

      after((done) => {
      })
    })

    describe('1 level tree', () => {
      // 1 level tree
      //     ┌◉┐
      //     │b│
      //   ◎─┘ └─◉
      //   a     c

      before((done) => {})
      after((done) => {})
    })

    describe('2 level tree', () => {
      // 2 levels tree
      //      ┌◉┐
      //      │c│
      //   ┌◎─┘ └─◉┐
      //   │b     d│
      // ◉─┘       └─◎
      // a           e

      before((done) => {})
      after((done) => {})
    })
  })
})

function spawnPubSubNode (callback) {
  createNode('/ip4/127.0.0.1/tcp/0', (err, node) => {
    if (err) {
      return callback(err)
    }
    const ps = new FloodSub(node)
    ps.start((err) => {
      if (err) {
        return callback(err)
      }
      callback(null, {
        libp2p: node,
        ps: ps
      })
    })
  })
}

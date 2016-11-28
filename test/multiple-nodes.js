/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const expect = require('chai').expect
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const Node = require('libp2p-ipfs-nodejs')
const parallel = require('async/parallel')
const PSG = require('../src')
const _values = require('lodash.values')

describe('multiple nodes', () => {
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
          (cb) => {
            spawnPubSubNode((err, node) => {
              if (err) {
                return cb(err)
              }
              a = node
              cb()
            })
          },
          (cb) => {
            spawnPubSubNode((err, node) => {
              if (err) {
                return cb(err)
              }
              b = node
              cb()
            })
          },
          (cb) => {
            spawnPubSubNode((err, node) => {
              if (err) {
                return cb(err)
              }
              c = node
              cb()
            })
          }
        ], done)
      })

      after((done) => {
        // note: setTimeout to avoid the tests finishing
        // before swarm does its dials
        setTimeout(() => {
          parallel([
            (cb) => {
              a.libp2p.stop(cb)
            },
            (cb) => {
              b.libp2p.stop(cb)
            },
            (cb) => {
              c.libp2p.stop(cb)
            }
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
        expect(a.ps.getSubscriptions()).to.eql(['Z'])

        setTimeout(() => {
          const peersB = _values(b.ps.getPeerSet())
          expect(peersB.length).to.equal(2)
          expect(peersB[1].topics).to.eql(['Z'])

          const peersC = _values(c.ps.getPeerSet())
          expect(peersC.length).to.equal(1)
          expect(peersC[0].topics).to.eql([])
          done()
        }, 200)
      })

      it('subscribe to the topic on node b', (done) => {
        b.ps.subscribe('Z')
        expect(b.ps.getSubscriptions()).to.eql(['Z'])

        setTimeout(() => {
          const peersA = _values(a.ps.getPeerSet())
          expect(peersA.length).to.equal(1)
          expect(peersA[0].topics).to.eql(['Z'])

          const peersC = _values(c.ps.getPeerSet())
          expect(peersC.length).to.equal(1)
          expect(peersC[0].topics).to.eql(['Z'])
          done()
        }, 200)
      })

      it('subscribe to the topic on node c', (done) => {
        c.ps.subscribe('Z')
        expect(c.ps.getSubscriptions()).to.eql(['Z'])

        setTimeout(() => {
          const peersA = _values(a.ps.getPeerSet())
          expect(peersA.length).to.equal(1)
          expect(peersA[0].topics).to.eql(['Z'])

          const peersB = _values(b.ps.getPeerSet())
          expect(peersB.length).to.equal(2)
          expect(peersB[0].topics).to.eql(['Z'])
          expect(peersB[1].topics).to.eql(['Z'])
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
          expect(msg.toString()).to.equal('hey')
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
            expect(msg.toString()).to.equal('hey')
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

      before((done) => {})
      after((done) => {})
    })
  })

  describe('only some nodes subscribe the networks', () => {
    describe('line', () => {
      // line
      // ◉────◎────◉
      // a    b    c

      before((done) => {
      })
      after((done) => {})
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
  PeerId.create((err, id) => {
    expect(err).to.not.exist
    PeerInfo.create(id, (err, peer) => {
      expect(err).to.not.exist
      peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
      const node = new Node(peer)
      let ps

      node.start((err) => {
        if (err) {
          return callback(err)
        }
        ps = new PSG(node)
        callback(null, {
          libp2p: node,
          ps: ps
        })
      })
    })
  })
}

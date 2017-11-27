/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')
const parallel = require('async/parallel')
const goodbye = require('pull-goodbye')
const serializer = require('pull-serializer')
const w = require('webrtcsupport')

const Node = require('./utils/bundle.browser')
const rawPeer = require('./fixtures/test-peer.json')

describe('transports', () => {
  describe('websockets', () => {
    let peerB
    let nodeA

    before((done) => {
      const ma = '/ip4/127.0.0.1/tcp/9200/ws/ipfs/' + rawPeer.id

      PeerId.createFromPrivKey(rawPeer.privKey, (err, id) => {
        if (err) {
          return done(err)
        }

        peerB = new PeerInfo(id)
        peerB.multiaddrs.add(ma)
        done()
      })
    })

    after((done) => nodeA.stop(done))

    it('create libp2pNode', (done) => {
      PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()
        peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

        nodeA = new Node(peerInfo)
        done()
      })
    })

    it('create libp2pNode with multiplex only', (done) => {
      PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()

        const b = new Node(peerInfo, null, { muxer: ['multiplex'] })
        expect(b.modules.connection.muxer).to.eql([require('libp2p-multiplex')])
        done()
      })
    })

    it('start libp2pNode', (done) => {
      nodeA.start(done)
    })

    // General connectivity tests

    it('libp2p.dial using Multiaddr nodeA to nodeB', (done) => {
      nodeA.dial(peerB.multiaddrs.toArray()[0], (err) => {
        expect(err).to.not.exist()

        setTimeout(check, 500) // Some time for Identify to finish

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          done()
        }
      })
    })

    it('libp2p.dial using Multiaddr on Protocol nodeA to nodeB', (done) => {
      nodeA.dial(peerB.multiaddrs.toArray()[0], '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()

        const peers = nodeA.peerBook.getAll()
        expect(Object.keys(peers)).to.have.length(1)

        pull(
          pull.values([Buffer.from('hey')]),
          conn,
          pull.collect((err, data) => {
            expect(err).to.not.exist()
            expect(data).to.eql([Buffer.from('hey')])
            done()
          })
        )
      })
    })

    it('libp2p.hangUp using Multiaddr nodeA to nodeB', (done) => {
      nodeA.hangUp(peerB.multiaddrs.toArray()[0], (err) => {
        expect(err).to.not.exist()

        setTimeout(check, 500)

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
          done()
        }
      })
    })

    it('libp2p.dial using PeerInfo nodeA to nodeB', (done) => {
      nodeA.dial(peerB, (err) => {
        expect(err).to.not.exist()

        setTimeout(check, 500) // Some time for Identify to finish

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          done()
        }
      })
    })

    it('libp2p.dial using PeerInfo on Protocol nodeA to nodeB', (done) => {
      nodeA.dial(peerB, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        const peers = nodeA.peerBook.getAll()
        expect(err).to.not.exist()
        expect(Object.keys(peers)).to.have.length(1)

        pull(
          pull.values([Buffer.from('hey')]),
          conn,
          pull.collect((err, data) => {
            expect(err).to.not.exist()
            expect(data).to.eql([Buffer.from('hey')])
            done()
          })
        )
      })
    })

    it('libp2p.hangUp using PeerInfo nodeA to nodeB', (done) => {
      nodeA.hangUp(peerB, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(err).to.not.exist()
          expect(Object.keys(peers)).to.have.length(1)
          expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
          done()
        }
      })
    })

    describe('stress', () => {
      it('one big write', (done) => {
        nodeA.dial(peerB, '/echo/1.0.0', (err, conn) => {
          expect(err).to.not.exist()
          const rawMessage = Buffer.alloc(100000)
          rawMessage.fill('a')

          const s = serializer(goodbye({
            source: pull.values([rawMessage]),
            sink: pull.collect((err, results) => {
              expect(err).to.not.exist()
              expect(results).to.have.length(1)
              expect(Buffer.from(results[0])).to.have.length(rawMessage.length)
              done()
            })
          }))
          pull(s, conn, s)
        })
      })

      it('many writes', (done) => {
        nodeA.dial(peerB, '/echo/1.0.0', (err, conn) => {
          expect(err).to.not.exist()

          const s = serializer(goodbye({
            source: pull(
              pull.infinite(),
              pull.take(1000),
              pull.map((val) => Buffer.from(val.toString()))
            ),
            sink: pull.collect((err, result) => {
              expect(err).to.not.exist()
              expect(result).to.have.length(1000)
              done()
            })
          }))

          pull(s, conn, s)
        })
      })
    })
  })

  describe('webrtc-star', () => {
    if (!w.support) { return console.log('NO WEBRTC SUPPORT') }

    let peer1
    let peer2
    let node1
    let node2

    it('create two peerInfo with webrtc-star addrs', (done) => {
      parallel([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (cb) => PeerId.create({ bits: 1024 }, cb)
      ], (err, ids) => {
        expect(err).to.not.exist()

        peer1 = new PeerInfo(ids[0])
        const ma1 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' + ids[0].toB58String()
        peer1.multiaddrs.add(ma1)

        peer2 = new PeerInfo(ids[1])
        const ma2 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' + ids[1].toB58String()
        peer2.multiaddrs.add(ma2)

        done()
      })
    })

    it('create two libp2p nodes with those peers', (done) => {
      node1 = new Node(peer1, null, { webRTCStar: true })
      node2 = new Node(peer2, null, { webRTCStar: true })
      done()
    })

    it('listen on the two libp2p nodes', (done) => {
      parallel([
        (cb) => node1.start(cb),
        (cb) => node2.start(cb)
      ], done)
    })

    it('handle a protocol on the first node', () => {
      node2.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
    })

    it('dial from the second node to the first node', (done) => {
      node1.dial(peer2, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const text = 'hello'
          const peers1 = node1.peerBook.getAll()
          expect(Object.keys(peers1)).to.have.length(1)

          const peers2 = node2.peerBook.getAll()
          expect(Object.keys(peers2)).to.have.length(1)

          pull(
            pull.values([Buffer.from(text)]),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist()
              expect(data[0].toString()).to.equal(text)
              done()
            })
          )
        }
      })
    })

    it('node1 hangUp node2', (done) => {
      node1.hangUp(peer2, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers = node1.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          expect(Object.keys(node1.swarm.muxedConns)).to.have.length(0)
          done()
        }
      })
    })

    it('create a third node and check that discovery works', (done) => {
      let counter = 0

      function check () {
        if (++counter === 3) {
          expect(Object.keys(node1.swarm.muxedConns).length).to.equal(1)
          expect(Object.keys(node2.swarm.muxedConns).length).to.equal(1)
          done()
        }
      }

      PeerId.create((err, id3) => {
        expect(err).to.not.exist()

        const peer3 = new PeerInfo(id3)
        const ma3 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' + id3.toB58String()
        peer3.multiaddrs.add(ma3)

        node1.on('peer:discovery', (peerInfo) => node1.dial(peerInfo, check))
        node2.on('peer:discovery', (peerInfo) => node2.dial(peerInfo, check))

        const node3 = new Node(peer3, null, { webRTCStar: true })
        node3.start(check)
      })
    })
  })

  describe('websocket-star', () => {
    let peer1
    let peer2
    let node1
    let node2

    it('create two peerInfo with websocket-star addrs', (done) => {
      parallel([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (cb) => PeerId.create({ bits: 1024 }, cb)
      ], (err, ids) => {
        expect(err).to.not.exist()

        peer1 = new PeerInfo(ids[0])
        const ma1 = '/ip4/127.0.0.1/tcp/14444/ws/p2p-websocket-star/'
        peer1.multiaddrs.add(ma1)

        peer2 = new PeerInfo(ids[1])
        const ma2 = '/ip4/127.0.0.1/tcp/14444/ws/p2p-websocket-star/'
        peer2.multiaddrs.add(ma2)

        done()
      })
    })

    it('create two libp2p nodes with those peers', (done) => {
      node1 = new Node(peer1, null, { wsStar: true })
      node2 = new Node(peer2, null, { wsStar: true })
      done()
    })

    it('listen on the two libp2p nodes', (done) => {
      parallel([
        (cb) => node1.start(cb),
        (cb) => node2.start(cb)
      ], done)
    })

    it('handle a protocol on the first node', () => {
      node2.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
    })

    it('dial from the second node to the first node', (done) => {
      node1.dial(peer2, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const text = 'hello'
          const peers1 = node1.peerBook.getAll()
          expect(Object.keys(peers1)).to.have.length(1)

          const peers2 = node2.peerBook.getAll()
          expect(Object.keys(peers2)).to.have.length(1)

          pull(
            pull.values([Buffer.from(text)]),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist()
              expect(data[0].toString()).to.equal(text)
              done()
            })
          )
        }
      })
    })

    it('node1 hangUp node2', (done) => {
      node1.hangUp(peer2, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers = node1.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          expect(Object.keys(node1.swarm.muxedConns)).to.have.length(0)
          done()
        }
      })
    })

    it('create a third node and check that discovery works', (done) => {
      let counter = 0

      function check () {
        if (++counter === 3) {
          expect(Object.keys(node1.swarm.muxedConns).length).to.equal(1)
          expect(Object.keys(node2.swarm.muxedConns).length).to.equal(1)
          done()
        }
      }

      PeerId.create((err, id3) => {
        expect(err).to.not.exist()

        const peer3 = new PeerInfo(id3)
        const ma3 = '/ip4/127.0.0.1/tcp/14444/ws/p2p-websocket-star/ipfs/' + id3.toB58String()
        peer3.multiaddrs.add(ma3)

        node1.on('peer:discovery', (peerInfo) => node1.dial(peerInfo, check))
        node2.on('peer:discovery', (peerInfo) => node2.dial(peerInfo, check))

        const node3 = new Node(peer3, null, { wsStar: true })
        node3.start(check)
      })
    })
  })
})

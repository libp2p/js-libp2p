/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const Mplex = require('libp2p-mplex')
const pull = require('pull-stream')
const parallel = require('async/parallel')
const goodbye = require('pull-goodbye')
const serializer = require('pull-serializer')
const wrtcSupport = self.RTCPeerConnection && ('createDataChannel' in self.RTCPeerConnection.prototype)
const tryEcho = require('./utils/try-echo')

const Node = require('./utils/bundle-browser')
const jsonPeerId = require('./fixtures/test-peer.json')

describe('transports', () => {
  describe('websockets', () => {
    let peerB
    let peerBMultiaddr = '/ip4/127.0.0.1/tcp/9200/ws/p2p/' + jsonPeerId.id
    let nodeA

    before((done) => {
      PeerId.createFromPrivKey(jsonPeerId.privKey, (err, id) => {
        expect(err).to.not.exist()

        peerB = new PeerInfo(id)
        peerB.multiaddrs.add(peerBMultiaddr)
        done()
      })
    })

    after((done) => nodeA.stop(done))

    it('create a libp2p Node', (done) => {
      PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()

        nodeA = new Node({
          peerInfo: peerInfo
        })
        done()
      })
    })

    it('create a libp2p Node with mplex only', (done) => {
      PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()

        const b = new Node({
          peerInfo: peerInfo,
          modules: {
            streamMuxer: [ Mplex ]
          }
        })
        expect(b._modules.streamMuxer).to.eql([require('libp2p-mplex')])
        done()
      })
    })

    it('start libp2pNode', (done) => {
      nodeA.start(done)
    })

    // General connectivity tests

    it('.dial using Multiaddr', (done) => {
      nodeA.dial(peerBMultiaddr, (err) => {
        expect(err).to.not.exist()

        setTimeout(check, 500) // Some time for Identify to finish

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          done()
        }
      })
    })

    it('.dialProtocol using Multiaddr', (done) => {
      nodeA.dialProtocol(peerBMultiaddr, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()

        const peers = nodeA.peerBook.getAll()
        expect(Object.keys(peers)).to.have.length(1)

        tryEcho(conn, done)
      })
    })

    it('.hangUp using Multiaddr', (done) => {
      nodeA.hangUp(peerBMultiaddr, (err) => {
        expect(err).to.not.exist()

        setTimeout(check, 500)

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(Object.keys(peers)).to.have.length(1)
          expect(nodeA._switch.connection.getAll()).to.have.length(0)
          done()
        }
      })
    })

    it('.dial using PeerInfo', (done) => {
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

    it('.dialProtocol using PeerInfo', (done) => {
      nodeA.dialProtocol(peerB, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        const peers = nodeA.peerBook.getAll()
        expect(err).to.not.exist()
        expect(Object.keys(peers)).to.have.length(1)

        tryEcho(conn, done)
      })
    })

    it('.hangUp using PeerInfo', (done) => {
      nodeA.hangUp(peerB, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers = nodeA.peerBook.getAll()
          expect(err).to.not.exist()
          expect(Object.keys(peers)).to.have.length(1)
          expect(nodeA._switch.connection.getAll()).to.have.length(0)
          done()
        }
      })
    })

    it('.dialFSM check conn and close', (done) => {
      nodeA.dialFSM(peerB, (err, connFSM) => {
        expect(err).to.not.exist()

        connFSM.once('muxed', () => {
          expect(
            nodeA._switch.connection.getAllById(peerB.id.toB58String())
          ).to.have.length(1)

          connFSM.once('error', done)
          connFSM.once('close', () => {
            // ensure the connection is closed
            expect(
              nodeA._switch.connection.getAllById(peerB.id.toB58String())
            ).to.have.length(0)

            done()
          })

          connFSM.close()
        })
      })
    })

    it('.dialFSM with a protocol, do an echo and close', (done) => {
      nodeA.dialFSM(peerB, '/echo/1.0.0', (err, connFSM) => {
        expect(err).to.not.exist()
        connFSM.once('connection', (conn) => {
          tryEcho(conn, () => {
            connFSM.close()
          })
        })
        connFSM.once('error', done)
        connFSM.once('close', done)
      })
    })

    describe('stress', () => {
      it('one big write', (done) => {
        nodeA.dialProtocol(peerB, '/echo/1.0.0', (err, conn) => {
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

      it('many writes', function (done) {
        this.timeout(10000)

        nodeA.dialProtocol(peerB, '/echo/1.0.0', (err, conn) => {
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
    /* eslint-disable-next-line no-console */
    if (!wrtcSupport) { return console.log('NO WEBRTC SUPPORT') }

    let peer1
    let peer2
    let node1
    let node2
    let node3

    after((done) => {
      parallel([
        (cb) => node1.stop(cb),
        (cb) => node2.stop(cb),
        (cb) => node3.stop(cb)
      ], done)
    })

    it('create two peerInfo with webrtc-star addrs', (done) => {
      parallel([
        (cb) => PeerId.create({ bits: 512 }, cb),
        (cb) => PeerId.create({ bits: 512 }, cb)
      ], (err, ids) => {
        expect(err).to.not.exist()

        peer1 = new PeerInfo(ids[0])
        const ma1 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/' + ids[0].toB58String()
        peer1.multiaddrs.add(ma1)

        peer2 = new PeerInfo(ids[1])
        const ma2 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/' + ids[1].toB58String()
        peer2.multiaddrs.add(ma2)

        done()
      })
    })

    it('create two libp2p nodes with those peers', (done) => {
      node1 = new Node({
        peerInfo: peer1
      })
      node2 = new Node({
        peerInfo: peer2
      })
      done()
    })

    it('start two libp2p nodes', (done) => {
      parallel([
        (cb) => node1.start(cb),
        (cb) => node2.start(cb)
      ], done)
    })

    it('.handle echo on first node', () => {
      node2.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
    })

    it('.dialProtocol from the second node to the first node', (done) => {
      node1.dialProtocol(peer2, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers1 = node1.peerBook.getAll()
          expect(Object.keys(peers1)).to.have.length(1)

          const peers2 = node2.peerBook.getAll()
          expect(Object.keys(peers2)).to.have.length(1)

          tryEcho(conn, done)
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
          expect(node1._switch.connection.getAll()).to.have.length(0)
          done()
        }
      })
    })

    it('create a third node and check that discovery works', (done) => {
      PeerId.create({ bits: 512 }, (err, id3) => {
        expect(err).to.not.exist()

        const b58Id = id3.toB58String()

        function check () {
          // Verify both nodes are connected to node 3
          if (node1._switch.connection.getAllById(b58Id) && node2._switch.connection.getAllById(b58Id)) {
            done()
          }
        }

        const peer3 = new PeerInfo(id3)
        const ma3 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/' + b58Id
        peer3.multiaddrs.add(ma3)

        node1.on('peer:discovery', (peerInfo) => node1.dial(peerInfo, check))
        node2.on('peer:discovery', (peerInfo) => node2.dial(peerInfo, check))

        node3 = new Node({
          peerInfo: peer3
        })
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
        (cb) => PeerId.create({ bits: 512 }, cb),
        (cb) => PeerId.create({ bits: 512 }, cb)
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
      node1 = new Node({
        peerInfo: peer1
      })
      node2 = new Node({
        peerInfo: peer2
      })
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

    it('.dialProtocol from the second node to the first node', (done) => {
      node1.dialProtocol(peer2, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          const peers1 = node1.peerBook.getAll()
          expect(Object.keys(peers1)).to.have.length(1)

          const peers2 = node2.peerBook.getAll()
          expect(Object.keys(peers2)).to.have.length(1)

          tryEcho(conn, done)
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
          expect(node1._switch.connection.getAll()).to.have.length(0)
          done()
        }
      })
    })

    it('create a third node and check that discovery works', function (done) {
      this.timeout(10 * 1000)

      let counter = 0

      function check () {
        if (++counter === 3) {
          expect(node1._switch.connection.getAll()).to.have.length(1)
          expect(node2._switch.connection.getAll()).to.have.length(1)
          done()
        }
      }

      PeerId.create((err, id3) => {
        expect(err).to.not.exist()

        const peer3 = new PeerInfo(id3)
        const ma3 = '/ip4/127.0.0.1/tcp/14444/ws/p2p-websocket-star/p2p/' + id3.toB58String()
        peer3.multiaddrs.add(ma3)

        node1.on('peer:discovery', (peerInfo) => node1.dial(peerInfo, check))
        node2.on('peer:discovery', (peerInfo) => node2.dial(peerInfo, check))

        const node3 = new Node({
          peerInfo: peer3
        })
        node3.start(check)
      })
    })
  })
})

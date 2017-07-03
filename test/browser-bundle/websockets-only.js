/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')
const goodbye = require('pull-goodbye')
const serializer = require('pull-serializer')

const Node = require('../src')
const rawPeer = require('./peer.json')

describe('libp2p-ipfs-browser (websockets only)', () => {
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
        pull.values([Buffer('hey')]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist()
          expect(data).to.eql([Buffer('hey')])
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
        pull.values([Buffer('hey')]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist()
          expect(data).to.eql([Buffer('hey')])
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
        const rawMessage = new Buffer(100000)
        rawMessage.fill('a')

        const s = serializer(goodbye({
          source: pull.values([rawMessage]),
          sink: pull.collect((err, results) => {
            expect(err).to.not.exist()
            expect(results).to.have.length(1)
            expect(Buffer(results[0])).to.have.length(rawMessage.length)
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
            pull.map((val) => Buffer(val.toString()))
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

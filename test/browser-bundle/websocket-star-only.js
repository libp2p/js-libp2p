/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const parallel = require('async/parallel')
const pull = require('pull-stream')

const Node = require('./browser-bundle')

describe('libp2p-ipfs-browser (websocket-star only)', () => {
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

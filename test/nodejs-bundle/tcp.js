/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')
const utils = require('./utils')
const createNode = utils.createNode
const echo = utils.echo

describe('TCP only', () => {
  let nodeA
  let nodeB

  before((done) => {
    parallel([
      (cb) => createNode('/ip4/0.0.0.0/tcp/0', (err, node) => {
        expect(err).to.not.exist()
        nodeA = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      }),
      (cb) => createNode('/ip4/0.0.0.0/tcp/0', (err, node) => {
        expect(err).to.not.exist()
        nodeB = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      })
    ], done)
  })

  after((done) => {
    parallel([
      (cb) => nodeA.stop(cb),
      (cb) => nodeB.stop(cb)
    ], done)
  })

  it('nodeA.dial nodeB using PeerInfo without proto (warmup)', (done) => {
    nodeA.dial(nodeB.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(err).to.not.exist()
            expect(Object.keys(peers)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(err).to.not.exist()
            expect(Object.keys(peers)).to.have.length(1)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeA.dial nodeB using PeerInfo', (done) => {
    nodeA.dial(nodeB.peerInfo, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist()

      pull(
        pull.values([Buffer.from('hey')]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist()
          expect(data).to.be.eql([Buffer.from('hey')])
          done()
        })
      )
    })
  })

  it('nodeA.hangUp nodeB using PeerInfo (first)', (done) => {
    nodeA.hangUp(nodeB.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeA.dial nodeB using multiaddr', (done) => {
    nodeA.dial(nodeB.peerInfo.multiaddrs.toArray()[0], '/echo/1.0.0', (err, conn) => {
      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        expect(err).to.not.exist()
        series([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1)
            cb()
          }
        ], () => {
          pull(
            pull.values([Buffer.from('hey')]),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist()
              expect(data).to.be.eql([Buffer.from('hey')])
              done()
            })
          )
        })
      }
    })
  })

  it('nodeA.hangUp nodeB using multiaddr (second)', (done) => {
    nodeA.hangUp(nodeB.peerInfo.multiaddrs.toArray()[0], (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeA.dial nodeB using PeerId', (done) => {
    nodeA.dial(nodeB.peerInfo.id, '/echo/1.0.0', (err, conn) => {
      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        expect(err).to.not.exist()
        series([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1)
            cb()
          }
        ], () => {
          pull(
            pull.values([Buffer.from('hey')]),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist()
              expect(data).to.be.eql([Buffer.from('hey')])
              done()
            })
          )
        })
      }
    })
  })

  it('nodeA.hangUp nodeB using PeerId (third)', (done) => {
    nodeA.hangUp(nodeB.peerInfo.multiaddrs.toArray()[0], (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeA.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeB.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)

            expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })
})

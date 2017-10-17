/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const signalling = require('libp2p-webrtc-star/src/sig-server')
const WStar = require('libp2p-webrtc-star')
const wrtc = require('wrtc')
const utils = require('./utils')
const createNode = utils.createNode
const echo = utils.echo

describe('TCP + WebSockets + WebRTCStar', () => {
  let nodeAll
  let nodeTCP
  let nodeWS
  let nodeWStar

  let ss

  before((done) => {
    parallel([
      (cb) => {
        signalling.start({ port: 24642 }, (err, server) => {
          expect(err).to.not.exist()
          ss = server
          cb()
        })
      },
      (cb) => {
        const wstar = new WStar({ wrtc: wrtc })
        createNode([
          '/ip4/0.0.0.0/tcp/0',
          '/ip4/127.0.0.1/tcp/25011/ws',
          '/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star'
        ], {
          modules: {
            transport: [wstar],
            discovery: [wstar.discovery]
          }
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeAll = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      },
      (cb) => createNode([
        '/ip4/0.0.0.0/tcp/0'
      ], (err, node) => {
        expect(err).to.not.exist()
        nodeTCP = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      }),
      (cb) => createNode([
        '/ip4/127.0.0.1/tcp/25022/ws'
      ], (err, node) => {
        expect(err).to.not.exist()
        nodeWS = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      }),

      (cb) => {
        const wstar = new WStar({ wrtc: wrtc })

        createNode([
          '/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star'
        ], {
          modules: {
            transport: [wstar],
            discovery: [wstar.discovery]
          }
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeWStar = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      }
    ], done)
  })

  after((done) => {
    parallel([
      (cb) => nodeAll.stop(cb),
      (cb) => nodeTCP.stop(cb),
      (cb) => nodeWS.stop(cb),
      (cb) => nodeWStar.stop(cb),
      (cb) => ss.stop(done)
    ], done)
  })

  it('nodeAll.dial nodeTCP using PeerInfo', (done) => {
    nodeAll.dial(nodeTCP.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeTCP.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeTCP.swarm.muxedConns)).to.have.length(1)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeAll.hangUp nodeTCP using PeerInfo', (done) => {
    nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeTCP.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeTCP.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeAll.dial nodeWS using PeerInfo', (done) => {
    nodeAll.dial(nodeWS.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(2)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeWS.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeWS.swarm.muxedConns)).to.have.length(1)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeAll.hangUp nodeWS using PeerInfo', (done) => {
    nodeAll.hangUp(nodeWS.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(2)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeWS.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeWS.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeAll.dial nodeWStar using PeerInfo', function (done) {
    this.timeout(10000)
    nodeAll.dial(nodeWStar.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(3)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(1)
            cb()
          },
          (cb) => {
            const peers = nodeWStar.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(1)
            cb()
          }
        ], done)
      }
    })
  })

  it('nodeAll.hangUp nodeWStar using PeerInfo', (done) => {
    nodeAll.hangUp(nodeWStar.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500)

      function check () {
        parallel([
          (cb) => {
            const peers = nodeAll.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(3)
            expect(Object.keys(nodeAll.swarm.muxedConns)).to.have.length(0)
            cb()
          },
          (cb) => {
            const peers = nodeWStar.peerBook.getAll()
            expect(Object.keys(peers)).to.have.length(1)
            expect(Object.keys(nodeWStar.swarm.muxedConns)).to.have.length(0)
            cb()
          }
        ], done)
      }
    })
  })
})

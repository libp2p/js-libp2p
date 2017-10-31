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

  before(function (done) {
    this.timeout(5000)
    parallel([
      (cb) => {
        signalling.start({ port: 24642 }, (err, server) => {
          expect(err).to.not.exist()
          ss = server
          cb()
        })
      },
      (cb) => {
        const wstar = new WStar({wrtc: wrtc})
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
        const wstar = new WStar({wrtc: wrtc})

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
      (cb) => ss.stop(cb)
    ], done)
  })

  function check (otherNode, done, muxed, peers) {
    let i = 1;
    [nodeAll, otherNode].forEach((node) => {
      expect(Object.keys(node.peerBook.getAll())).to.have.length(i-- ? peers : 1)
      expect(Object.keys(node.swarm.muxedConns)).to.have.length(muxed)
    })
    done()
  }

  it('nodeAll.dial nodeTCP using PeerInfo', (done) => {
    nodeAll.dial(nodeTCP.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500, nodeTCP, done, 1, 1)
    })
  })

  it('nodeAll.hangUp nodeTCP using PeerInfo', (done) => {
    nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500, nodeTCP, done, 0, 1)
    })
  })

  it('nodeAll.dial nodeWS using PeerInfo', (done) => {
    nodeAll.dial(nodeWS.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500, nodeWS, done, 1, 2)
    })
  })

  it('nodeAll.hangUp nodeWS using PeerInfo', (done) => {
    nodeAll.hangUp(nodeWS.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500, nodeWS, done, 0, 2)
    })
  })

  it('nodeAll.dial nodeWStar using PeerInfo', function (done) {
    this.timeout(10000)
    nodeAll.dial(nodeWStar.peerInfo, (err) => {
      expect(err).to.not.exist()

      // Some time for Identify to finish
      setTimeout(check, 500, nodeWStar, done, 1, 3)
    })
  })

  it('nodeAll.hangUp nodeWStar using PeerInfo', (done) => {
    nodeAll.hangUp(nodeWStar.peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(check, 500, nodeWStar, done, 0, 3)
    })
  })
})

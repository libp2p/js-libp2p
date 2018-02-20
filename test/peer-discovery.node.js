/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const signalling = require('libp2p-webrtc-star/src/sig-server')
const parallel = require('async/parallel')

const createNode = require('./utils/create-node')
const echo = require('./utils/echo')

describe('peer discovery', () => {
  let nodeA
  let nodeB
  let port = 24642
  let ss

  function setup (options) {
    before((done) => {
      port++
      parallel([
        (cb) => {
          signalling.start({ port: port }, (err, server) => {
            expect(err).to.not.exist()
            ss = server
            cb()
          })
        },
        (cb) => createNode([
          '/ip4/0.0.0.0/tcp/0',
          `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`
        ], options, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode([
          '/ip4/0.0.0.0/tcp/0',
          `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`
        ], options, (err, node) => {
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
        (cb) => nodeB.stop(cb),
        (cb) => ss.stop(done)
      ], done)
    })
  }

  describe('MulticastDNS', () => {
    setup({
      config: {
        peerDiscovery: {
          mdns: {
            enabled: true
          }
        }
      }
    })

    it('find a peer', function (done) {
      this.timeout(15 * 1000)

      nodeA.once('peer:discovery', (peerInfo) => {
        expect(nodeB.peerInfo.id.toB58String())
          .to.eql(peerInfo.id.toB58String())
        done()
      })
    })
  })

  // TODO needs a delay (this test is already long)
  describe.skip('WebRTCStar', () => {
    setup({ webRTCStar: true })

    it('find a peer', function (done) {
      this.timeout(15 * 1000)
      nodeA.once('peer:discovery', (peerInfo) => {
        expect(nodeB.peerInfo.id.toB58String())
          .to.eql(peerInfo.id.toB58String())
        done()
      })
    })
  })

  describe('MulticastDNS + WebRTCStar', () => {
    setup({
      config: {
        peerDiscovery: {
          mdns: {
            enabled: true
          },
          webRTCStar: {
            enabled: true
          }
        }
      }
    })

    it('find a peer', function (done) {
      this.timeout(15 * 1000)
      nodeA.once('peer:discovery', (peerInfo) => {
        expect(nodeB.peerInfo.id.toB58String())
          .to.eql(peerInfo.id.toB58String())
        done()
      })
    })
  })
})

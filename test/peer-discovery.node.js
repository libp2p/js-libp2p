/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const sinon = require('sinon')
const signalling = require('libp2p-webrtc-star/src/sig-server')
const parallel = require('async/parallel')
const crypto = require('crypto')

const createNode = require('./utils/create-node')
const echo = require('./utils/echo')

describe('peer discovery', () => {
  let nodeA
  let nodeB
  let nodeC
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
        }),
        (cb) => createNode([
          '/ip4/0.0.0.0/tcp/0',
          `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`
        ], options, (err, node) => {
          expect(err).to.not.exist()
          nodeC = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], done)
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb),
        (cb) => nodeC.stop(cb),
        (cb) => ss.stop(cb)
      ], done)
    })
  }

  describe('module registration', () => {
    it('should enable by default a module passed as an object', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0)
      }

      const options = { modules: { peerDiscovery: [ mockDiscovery ] } }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.true()
          node.stop(done)
        })
      })
    })

    it('should enable by default a module passed as a function', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0)
      }

      const MockDiscovery = sinon.stub().returns(mockDiscovery)

      const options = { modules: { peerDiscovery: [ MockDiscovery ] } }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.true()
          node.stop(done)
        })
      })
    })

    it('should enable module by configutation', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0),
        tag: 'mockDiscovery'
      }

      const enabled = sinon.stub().returns(true)

      const options = {
        modules: { peerDiscovery: [ mockDiscovery ] },
        config: {
          peerDiscovery: {
            mockDiscovery: {
              get enabled () {
                return enabled()
              }
            }
          }
        }
      }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.true()
          expect(enabled.called).to.be.true()
          node.stop(done)
        })
      })
    })

    it('should disable module by configutation', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0),
        tag: 'mockDiscovery'
      }

      const disabled = sinon.stub().returns(false)

      const options = {
        modules: { peerDiscovery: [ mockDiscovery ] },
        config: {
          peerDiscovery: {
            mockDiscovery: {
              get enabled () {
                return disabled()
              }
            }
          }
        }
      }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.false()
          expect(disabled.called).to.be.true()
          node.stop(done)
        })
      })
    })

    it('should register module passed as function', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0)
      }

      const MockDiscovery = sinon.stub().returns(mockDiscovery)
      MockDiscovery.tag = 'mockDiscovery'

      const options = {
        modules: { peerDiscovery: [ MockDiscovery ] },
        config: {
          peerDiscovery: {
            mockDiscovery: {
              enabled: true,
              time: Date.now()
            }
          }
        }
      }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.true()
          expect(MockDiscovery.called).to.be.true()
          // Ensure configuration was passed
          expect(MockDiscovery.firstCall.args[0])
            .to.deep.include(options.config.peerDiscovery.mockDiscovery)
          node.stop(done)
        })
      })
    })

    it('should register module passed as object', (done) => {
      const mockDiscovery = {
        on: sinon.stub(),
        start: sinon.stub().callsArg(0),
        stop: sinon.stub().callsArg(0),
        tag: 'mockDiscovery'
      }

      const options = {
        modules: { peerDiscovery: [ mockDiscovery ] },
        config: {
          peerDiscovery: {
            mockDiscovery: { enabled: true }
          }
        }
      }

      createNode(['/ip4/0.0.0.0/tcp/0'], options, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()
          expect(mockDiscovery.start.called).to.be.true()
          node.stop(done)
        })
      })
    })
  })

  describe('MulticastDNS', () => {
    setup({
      config: {
        dht: {
          enabled: false
        },
        peerDiscovery: {
          mdns: {
            enabled: true,
            interval: 1e3, // discover quickly
            // use a random tag to prevent CI collision
            serviceTag: crypto.randomBytes(10).toString('hex')
          }
        }
      }
    })

    it('find peers', function (done) {
      let expectedPeers = new Set([
        nodeB.peerInfo.id.toB58String(),
        nodeC.peerInfo.id.toB58String()
      ])

      function finish () {
        nodeA.removeAllListeners('peer:discovery')
        expect(expectedPeers.size).to.eql(0)
        done()
      }

      nodeA.on('peer:discovery', (peerInfo) => {
        expectedPeers.delete(peerInfo.id.toB58String())
        if (expectedPeers.size === 0) {
          finish()
        }
      })
    })
  })

  // TODO needs a delay (this test is already long)
  describe.skip('WebRTCStar', () => {
    setup({
      config: {
        dht: {
          enabled: false
        },
        peerDiscovery: {
          webRTCStar: {
            enabled: true
          }
        }
      }
    })

    it('find peers', function (done) {
      this.timeout(20e3)
      let expectedPeers = new Set([
        nodeB.peerInfo.id.toB58String(),
        nodeC.peerInfo.id.toB58String()
      ])

      function finish () {
        nodeA.removeAllListeners('peer:discovery')
        expect(expectedPeers.size).to.eql(0)
        done()
      }

      nodeA.on('peer:discovery', (peerInfo) => {
        expectedPeers.delete(peerInfo.id.toB58String())
        if (expectedPeers.size === 0) {
          finish()
        }
      })
    })
  })

  describe('MulticastDNS + WebRTCStar', () => {
    setup({
      config: {
        dht: {
          enabled: false
        },
        peerDiscovery: {
          mdns: {
            enabled: true,
            interval: 1e3, // discovery quickly
            // use a random tag to prevent CI collision
            serviceTag: crypto.randomBytes(10).toString('hex')
          },
          webRTCStar: {
            enabled: true
          }
        }
      }
    })

    it('find peers', function (done) {
      let expectedPeers = new Set([
        nodeB.peerInfo.id.toB58String(),
        nodeC.peerInfo.id.toB58String()
      ])

      function finish () {
        nodeA.removeAllListeners('peer:discovery')
        expect(expectedPeers.size).to.eql(0)
        done()
      }

      nodeA.on('peer:discovery', (peerInfo) => {
        expectedPeers.delete(peerInfo.id.toB58String())
        if (expectedPeers.size === 0) {
          finish()
        }
      })
    })
  })

  describe('dht', () => {
    setup({
      config: {
        peerDiscovery: {
          mdns: {
            enabled: false
          },
          webRTCStar: {
            enabled: false
          }
        },
        dht: {
          enabled: true,
          kBucketSize: 20,
          randomWalk: {
            enabled: true,
            queriesPerPeriod: 1,
            interval: 1000, // start the query sooner
            timeout: 3000
          }
        }
      }
    })

    it('find peers through the dht', function (done) {
      let expectedPeers = new Set([
        nodeB.peerInfo.id.toB58String(),
        nodeC.peerInfo.id.toB58String()
      ])

      function finish () {
        nodeA.removeAllListeners('peer:discovery')
        expect(expectedPeers.size).to.eql(0)
        done()
      }

      nodeA.on('peer:discovery', (peerInfo) => {
        expectedPeers.delete(peerInfo.id.toB58String())
        if (expectedPeers.size === 0) {
          finish()
        }
      })

      // Topology:
      // A -> B
      // C -> B
      nodeA.dial(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist()
      })
      nodeC.dial(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist()
      })
    })
  })
})

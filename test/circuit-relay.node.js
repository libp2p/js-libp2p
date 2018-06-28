/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const sinon = require('sinon')
const waterfall = require('async/waterfall')
const series = require('async/series')
const parallel = require('async/parallel')
const Circuit = require('libp2p-circuit')
const multiaddr = require('multiaddr')

const createNode = require('./utils/create-node')
const tryEcho = require('./utils/try-echo')
const echo = require('./utils/echo')

describe('circuit relay', () => {
  let handlerSpies = []
  let relayNode1
  let relayNode2
  let nodeWS1
  let nodeWS2
  let nodeTCP1
  let nodeTCP2

  function setupNode (addrs, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    options = options || {}

    return createNode(addrs, options, (err, node) => {
      expect(err).to.not.exist()

      node.handle('/echo/1.0.0', echo)
      node.start((err) => {
        expect(err).to.not.exist()

        handlerSpies.push(sinon.spy(
          node._switch.transports[Circuit.tag].listeners[0].hopHandler, 'handle'
        ))

        callback(node)
      })
    })
  }

  before(function (done) {
    this.timeout(20 * 1000)

    waterfall([
      // set up passive relay
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0/ws',
        '/ip4/0.0.0.0/tcp/0'
      ], {
        config: {
          relay: {
            enabled: true,
            hop: {
              enabled: true,
              active: false // passive relay
            }
          }
        }
      }, (node) => {
        relayNode1 = node
        cb()
      }),
      // setup active relay
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0/ws',
        '/ip4/0.0.0.0/tcp/0'
      ], {
        config: {
          relay: {
            enabled: true,
            hop: {
              enabled: true,
              active: false // passive relay
            }
          }
        }
      }, (node) => {
        relayNode2 = node
        cb()
      }),
      // setup node with WS
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0/ws'
      ], {
        config: {
          relay: {
            enabled: true
          }
        }
      }, (node) => {
        nodeWS1 = node
        cb()
      }),
      // setup node with WS
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0/ws'
      ], {
        config: {
          relay: {
            enabled: true
          }
        }
      }, (node) => {
        nodeWS2 = node
        cb()
      }),
      // set up node with TCP and listening on relay1
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0',
        `/ipfs/${relayNode1.peerInfo.id.toB58String()}/p2p-circuit`
      ], {
        config: {
          relay: {
            enabled: true
          }
        }
      }, (node) => {
        nodeTCP1 = node
        cb()
      }),
      // set up node with TCP and listening on relay2 over TCP transport
      (cb) => setupNode([
        '/ip4/0.0.0.0/tcp/0',
        `/ip4/0.0.0.0/tcp/0/ipfs/${relayNode2.peerInfo.id.toB58String()}/p2p-circuit`
      ], {
        config: {
          relay: {
            enabled: true
          }
        }
      }, (node) => {
        nodeTCP2 = node
        cb()
      })
    ], (err) => {
      expect(err).to.not.exist()

      series([
        (cb) => nodeWS1.dial(relayNode1.peerInfo, cb),
        (cb) => nodeWS1.dial(relayNode2.peerInfo, cb),
        (cb) => nodeTCP1.dial(relayNode1.peerInfo, cb),
        (cb) => nodeTCP2.dial(relayNode2.peerInfo, cb)
      ], done)
    })
  })

  after((done) => {
    parallel([
      (cb) => relayNode1.stop(cb),
      (cb) => relayNode2.stop(cb),
      (cb) => nodeWS1.stop(cb),
      (cb) => nodeWS2.stop(cb),
      (cb) => nodeTCP1.stop(cb),
      (cb) => nodeTCP2.stop(cb)
    ], done)
  })

  describe('any relay', function () {
    this.timeout(20 * 1000)

    it('dial from WS1 to TCP1 over any R', (done) => {
      nodeWS1.dialProtocol(nodeTCP1.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()
        tryEcho(conn, done)
      })
    })

    it('fail to dial - no R from WS2 to TCP1', (done) => {
      nodeWS2.dialProtocol(nodeTCP2.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()
        done()
      })
    })
  })

  describe('explicit relay', function () {
    this.timeout(20 * 1000)

    it('dial from WS1 to TCP1 over R1', (done) => {
      nodeWS1.dialProtocol(nodeTCP1.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()

        tryEcho(conn, () => {
          const addr = multiaddr(handlerSpies[0].args[2][0].dstPeer.addrs[0]).toString()
          expect(addr).to.equal(`/ipfs/${nodeTCP1.peerInfo.id.toB58String()}`)
          done()
        })
      })
    })

    it('dial from WS1 to TCP2 over R2', (done) => {
      nodeWS1.dialProtocol(nodeTCP2.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()

        tryEcho(conn, () => {
          const addr = multiaddr(handlerSpies[1].args[2][0].dstPeer.addrs[0]).toString()
          expect(addr).to.equal(`/ipfs/${nodeTCP2.peerInfo.id.toB58String()}`)
          done()
        })
      })
    })
  })
})

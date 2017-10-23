/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const waterfall = require('async/waterfall')
const series = require('async/series')
const parallel = require('async/parallel')
const utils = require('./utils')
const Circuit = require('libp2p-circuit')
const multiaddr = require('multiaddr')

const chai = require('chai')
chai.use(require('dirty-chai'))

const expect = chai.expect
const sinon = require('sinon')

describe(`circuit`, function () {
  let handlerSpies = []
  let relayNode1
  let relayNode2
  let nodeWS1
  let nodeWS2
  let nodeTCP1
  let nodeTCP2

  function setupNode (addrs, options, cb) {
    if (typeof options === 'function') {
      cb = options
      options = {}
    }

    options = options || {}

    return utils.createNode(addrs, options, (err, node) => {
      expect(err).to.not.exist()

      node.handle('/echo/1.0.0', utils.echo)
      node.start((err) => {
        expect(err).to.not.exist()

        handlerSpies.push(sinon.spy(node.swarm.transports[Circuit.tag].listeners[0].hopHandler, 'handle'))
        cb(node)
      })
    })
  }

  before((done) => {
    waterfall([
      // set up passive relay
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9010/ws`,
        `/ip4/0.0.0.0/tcp/9011`
      ], {
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: false // passive relay
          }
        }
      }, (node) => {
        relayNode1 = node
        cb()
      }),
      // setup active relay
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9110/ws`,
        `/ip4/0.0.0.0/tcp/9111`
      ], {
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: false // passive relay
          }
        }
      }, (node) => {
        relayNode2 = node
        cb()
      }),
      // setup node with WS
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9210/ws`
      ], {
        relay: {
          enabled: true
        }
      }, (node) => {
        nodeWS1 = node
        cb()
      }),
      // setup node with WS
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9410/ws`
      ], {
        relay: {
          enabled: true
        }
      }, (node) => {
        nodeWS2 = node
        cb()
      }),
      // set up node with TCP and listening on relay1
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9211`,
        `/ipfs/${relayNode1.peerInfo.id.toB58String()}/p2p-circuit`
      ], {
        relay: {
          enabled: true
        }
      }, (node) => {
        nodeTCP1 = node
        cb()
      }),
      // set up node with TCP and listening on relay2 over TCP transport
      (cb) => setupNode([
        `/ip4/0.0.0.0/tcp/9311`,
        `/ip4/0.0.0.0/tcp/9111/ipfs/${relayNode2.peerInfo.id.toB58String()}/p2p-circuit`
      ], {
        relay: {
          enabled: true
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
        (cb) => nodeTCP1.dial(relayNode1.peerInfo, cb)
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

  describe(`any relay`, function () {
    it('should dial from WS1 to TCP1 over any R', function (done) {
      nodeWS1.dial(nodeTCP1.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()

        pull(
          pull.values(['hello']),
          conn,
          pull.collect((e, result) => {
            expect(e).to.not.exist()
            expect(result[0].toString()).to.equal('hello')
            done()
          })
        )
      })
    })

    it(`should not dial - no R from WS2 to TCP1`, function (done) {
      nodeWS2.dial(nodeTCP2.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()
        done()
      })
    })
  })

  describe(`explicit relay`, function () {
    it('should dial from WS1 to TCP1 over R1', function (done) {
      nodeWS1.dial(nodeTCP1.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()

        pull(
          pull.values(['hello']),
          conn,
          pull.collect((e, result) => {
            expect(e).to.not.exist()
            expect(result[0].toString()).to.equal('hello')

            const addr = multiaddr(handlerSpies[0].args[2][0].dstPeer.addrs[0]).toString()
            expect(addr).to.equal(`/ipfs/${nodeTCP1.peerInfo.id.toB58String()}`)
            done()
          })
        )
      })
    })

    it(`should dial from WS1 to TCP2 over R2`, function (done) {
      nodeWS1.dial(nodeTCP2.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(conn).to.exist()

        pull(
          pull.values(['hello']),
          conn,
          pull.collect((e, result) => {
            expect(e).to.not.exist()
            expect(result[0].toString()).to.equal('hello')

            const addr = multiaddr(handlerSpies[1].args[2][0].dstPeer.addrs[0]).toString()
            expect(addr).to.equal(`/ipfs/${nodeTCP2.peerInfo.id.toB58String()}`)
            done()
          })
        )
      })
    })
  })
})

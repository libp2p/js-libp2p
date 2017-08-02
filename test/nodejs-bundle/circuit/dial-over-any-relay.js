/* eslint-env mocha */
'use strict'

const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const multiplex = require('libp2p-multiplex')

const waterfall = require('async/waterfall')
const utils = require('./helpers/utils')

const chai = require('chai')
chai.use(require('dirty-chai'))

const expect = chai.expect

describe('test connecting over any relay', function () {
  this.timeout(500000)

  let portBase = 9010 // TODO: randomize or mock sockets
  let testNodes

  function setUpNodes (muxer, done) {
    utils.createNodes(
      {
        relayNode: {
          transports: [new TCP(), new WS()],
          muxer: muxer,
          addrs: [
            `/ip4/0.0.0.0/tcp/${portBase++}`,
            `/ip4/0.0.0.0/tcp/${portBase++}/ws`
          ],
          isCrypto: true,
          config: {
            relay: {
              circuit: {
                enabled: true
              }
            }
          }
        },
        nodeA: {
          transports: [new TCP()],
          isCrypto: true,
          muxer: muxer,
          addrs: [
            `/ip4/0.0.0.0/tcp/${portBase++}`
          ]
        },
        nodeB: {
          transports: [new WS()],
          isCrypto: true,
          muxer: muxer,
          addrs: [
            `/ip4/0.0.0.0/tcp/${portBase++}/ws`
          ]
        }
      },
      (err, nodes) => {
        if (err) {
          return done(err)
        }

        testNodes = nodes
        done()
      })
  }

  beforeEach(function (done) {
    setUpNodes(multiplex, () => {
      let nodeA = testNodes['nodeA']
      let nodeB = testNodes['nodeB']
      let relayNode = testNodes['relayNode']

      waterfall([
        (cb) => nodeA.dial(relayNode.peerInfo, cb),
        (conn, cb) => nodeB.dial(relayNode.peerInfo, cb)
      ], () => setTimeout(done, 1000)) // WS needs some time to initialize
    })
  })

  afterEach(function circuitTests (done) {
    utils.stopNodes(testNodes, () => done())
  })

  it('dial to a node over a relay and write values', function (done) {
    utils.dialAndReverse(
      testNodes.nodeB,
      testNodes.nodeA,
      ['hello', 'hello1', 'hello2', 'hello3'],
      (err, result) => {
        expect(err).to.be.null()
        expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
        expect(result[1]).to.equal('hello1'.split('').reverse('').join(''))
        expect(result[2]).to.equal('hello2'.split('').reverse('').join(''))
        expect(result[3]).to.equal('hello3'.split('').reverse('').join(''))
        done()
      })
  })
})

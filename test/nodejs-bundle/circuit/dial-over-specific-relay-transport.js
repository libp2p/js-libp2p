/* eslint-env mocha */
'use strict'

const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const multiplex = require('libp2p-multiplex')
const multiaddr = require('multiaddr')

const waterfall = require('async/waterfall')
const utils = require('./helpers/utils')

const sinon = require('sinon')
const chai = require('chai')
chai.use(require('dirty-chai'))

const expect = chai.expect

const nodeKeys = require('./fixtures/nodes')
const Circuit = require('libp2p-circuit')

describe(`dial over specific relay and transport`, function () {
  describe(`listen on an explicit chained relay addr`, function () {
    this.timeout(500000)

    let portBase = 9030 // TODO: randomize or mock sockets
    let testNodes

    let relaySpy1
    let relaySpy2

    function setUpNodes (muxer, done) {
      utils.createNodes(
        {
          relayNode1: {
            id: nodeKeys.node1,
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
                  enabled: true,
                  active: true
                }
              }
            }
          },
          relayNode2: {
            id: nodeKeys.node2,
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
                  enabled: true,
                  active: true
                }
              }
            }
          },
          nodeA: {
            id: nodeKeys.node3,
            transports: [new TCP()],
            isCrypto: true,
            muxer: muxer,
            addrs: [
              `/ip4/0.0.0.0/tcp/${portBase++}`
            ]
          },
          nodeB: {
            id: nodeKeys.node4,
            transports: [new WS()],
            isCrypto: true,
            muxer: muxer,
            addrs: [
              `/ip4/0.0.0.0/tcp/9031/ws/ipfs/${nodeKeys.node1.id}/p2p-circuit`
            ]
          }
        },
        (err, nodes) => {
          if (err) {
            return done(err)
          }

          testNodes = nodes
          relaySpy1 = sinon.spy(testNodes['relayNode1'].swarm.transports[Circuit.tag].listeners[0].hopHandler, 'handle')
          relaySpy2 = sinon.spy(testNodes['relayNode2'].swarm.transports[Circuit.tag].listeners[0].hopHandler, 'handle')

          done()
        })
    }

    beforeEach(function (done) {
      setUpNodes(multiplex, () => {
        let nodeA = testNodes['nodeA']
        let nodeB = testNodes['nodeB']
        let relayNode1 = testNodes['relayNode1']
        let relayNode2 = testNodes['relayNode2']

        waterfall([
          (cb) => nodeA.dial(relayNode1.peerInfo, cb),
          (conn, cb) => nodeA.dial(relayNode2.peerInfo, cb),
          (conn, cb) => nodeB.dial(relayNode1.peerInfo, cb),
          (conn, cb) => nodeB.dial(relayNode2.peerInfo, cb),
          (conn, cb) => relayNode1.dial(relayNode2.peerInfo, cb),
          (conn, cb) => relayNode2.dial(relayNode1.peerInfo, cb)
        ], () => setTimeout(done, 1000)) // WS needs some time to initialize
      })
    })

    afterEach(function circuitTests (done) {
      relaySpy1.reset()
      relaySpy2.reset()
      utils.stopNodes(testNodes, done)
    })

    it('dial over the correct chained relay addr', function (done) {
      utils.dialAndReverse(testNodes['nodeA'], testNodes['nodeB'], ['hello'], (err, result) => {
        expect(err).to.be.null()
        expect(relaySpy1.called).to.be.ok()
        expect(relaySpy2.called).to.be.ok()

        expect(relaySpy1.args.some((a) => {
          return a[0] &&
            a[0].dstPeer &&
            multiaddr(a[0].dstPeer.addrs[0]).toString() === `/ipfs/${testNodes['nodeB'].peerInfo.id.toB58String()}`
        })).to.be.ok()

        expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
        done(err)
      })
    })
  })
})

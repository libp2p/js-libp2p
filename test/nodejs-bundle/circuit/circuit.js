/* eslint-env mocha */
'use strict'

const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const multiplex = require('libp2p-multiplex')

const waterfall = require('async/waterfall')
const utils = require('./helpers/utils')

const sinon = require('sinon')
const chai = require('chai')
chai.use(require('dirty-chai'))

const expect = chai.expect

const nodeKeys = require('./fixtures/nodes')

describe('test relay', function () {
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
        testNodes.nodeA,
        testNodes.nodeB,
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

  describe('test listening on relay address', function () {
    this.timeout(500000)

    describe(`listen on an explicit relay addr`, function () {
      let portBase = 9020 // TODO: randomize or mock sockets
      let testNodes

      let relaySpy1
      let relaySpy2
      let active = false

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
                    active: active
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
                    active: active
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
                `/ip4/0.0.0.0/tcp/${portBase++}`,
                `/ip4/0.0.0.0/tcp/9022/ipfs/${nodeKeys.node2.id}/p2p-circuit`,
                `/ip4/0.0.0.0/tcp/9023/ws/ipfs/${nodeKeys.node2.id}/p2p-circuit`,
                `/ipfs/${nodeKeys.node2.id}/p2p-circuit`
              ]
            },
            nodeB: {
              id: nodeKeys.node4,
              transports: [new WS()],
              isCrypto: true,
              muxer: muxer,
              addrs: [
                `/ip4/0.0.0.0/tcp/${portBase++}/ws`,
                `/ip4/0.0.0.0/tcp/9020/ipfs/${nodeKeys.node1.id}/p2p-circuit`,
                `/ip4/0.0.0.0/tcp/9021/ws/ipfs/${nodeKeys.node1.id}/p2p-circuit`,
                `/ipfs/${nodeKeys.node1.id}/p2p-circuit`
              ]
            }
          },
          (err, nodes) => {
            if (err) {
              return done(err)
            }

            testNodes = nodes
            relaySpy1 = sinon.spy(testNodes['relayNode1'].swarm.transports['Circuit'].listeners[0].hopHandler, 'handle')
            relaySpy2 = sinon.spy(testNodes['relayNode2'].swarm.transports['Circuit'].listeners[0].hopHandler, 'handle')

            done()
          })
      }

      // no way to tell which relay is going to be used with multidialing
      describe(`passive`, function () {
        beforeEach(function (done) {
          waterfall([
            (cb) => setUpNodes(multiplex, cb),
            (cb) => {
              let nodeA = testNodes['nodeA']
              let nodeB = testNodes['nodeB']
              let relayNode1 = testNodes['relayNode1']
              let relayNode2 = testNodes['relayNode2']

              waterfall([
                (cb) => nodeA.dial(relayNode1.peerInfo, cb),
                (conn, cb) => nodeA.dial(relayNode2.peerInfo, cb),
                (conn, cb) => nodeB.dial(relayNode1.peerInfo, cb),
                (conn, cb) => nodeB.dial(relayNode2.peerInfo, cb)
              ], () => setTimeout(cb, 1000)) // WS needs some time to initialize
            }
          ], done)
        })

        afterEach(function circuitTests (done) {
          utils.stopNodes(testNodes, done)
        })

        it('dial over the correct relay', function (done) {
          utils.dialAndReverse(testNodes['nodeA'], testNodes['nodeB'], ['hello'], (err, result) => {
            expect(err).to.be.null()

            expect(relaySpy1.args.some((a) => {
              return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ipfs/${testNodes['nodeB'].peerInfo.id.toB58String()}`
            })).to.be.ok()

            expect(result[0]).to.equal('hello'.split('').reverse('').join(''))

            done(err)
          })
        })

        it('dial over the correct relay and transport', function (done) {
          utils.dialAndReverse(testNodes['nodeB'], testNodes['nodeA'], ['hello'], (err, result) => {
            expect(err).to.be.null()

            expect(relaySpy2.args.some((a) => {
              return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ipfs/${testNodes['nodeA'].peerInfo.id.toB58String()}`
            })).to.be.ok()

            expect(result[0]).to.equal('hello'.split('').reverse('').join(''))

            done(err)
          })
        })
      })

      // describe.skip(`active`, function () {
      //   beforeEach(function (done) {
      //     active = true
      //     setUpNodes(multiplex, () => {
      //       setTimeout(done, 1000) // give the nodes time to startup
      //     })
      //   })
      //
      //   afterEach(function circuitTests (done) {
      //     relaySpy1.reset()
      //     relaySpy2.reset()
      //     utils.stopNodes(testNodes, done)
      //   })
      //
      //   it('dial over the correct relay', function (done) {
      //     utils.dialAndReverse(testNodes['nodeA'], testNodes['nodeB'], ['hello'], (err, result) => {
      //       expect(err).to.be.null()
      //       expect(relaySpy2.called).to.be.not.ok()
      //       expect(relaySpy1.called).to.be.ok()
      //
      //       expect(relaySpy1.args[0][1].toString())
      //         .to
      //         .equal((`/ipfs/${testNodes['nodeB'].peerInfo.id.toB58String()}`))
      //
      //       expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
      //
      //       done(err)
      //     })
      //   })
      //
      //   it('dial over the correct relay and transport', function (done) {
      //     utils.dialAndReverse(testNodes['nodeB'], testNodes['nodeA'], ['hello'], (err, result) => {
      //       expect(err).to.be.null()
      //       expect(relaySpy1.called).to.be.not.ok()
      //       expect(relaySpy2.called).to.be.ok()
      //
      //       expect(relaySpy2.args[0][1].toString())
      //         .to
      //         .equal((`/ipfs/${testNodes['nodeA'].peerInfo.id.toB58String()}`))
      //
      //       expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
      //
      //       done(err)
      //     })
      //   })
      // })
    })

    describe(`listen on an explicit chained relay addr`, function () {
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
                `/ip4/0.0.0.0/tcp/${portBase++}`,
                `/ip4/0.0.0.0/tcp/9033/ws/ipfs/${nodeKeys.node2.id}/p2p-circuit` +
                `/ip4/0.0.0.0/tcp/9031/ipfs/${nodeKeys.node1.id}/p2p-circuit`
              ]
            },
            nodeB: {
              id: nodeKeys.node4,
              transports: [new WS()],
              isCrypto: true,
              muxer: muxer,
              addrs: [
                `/ip4/0.0.0.0/tcp/${portBase++}/ws`,
                `/ipfs/${nodeKeys.node1.id}/p2p-circuit/ipfs/${nodeKeys.node2.id}/p2p-circuit`
              ]
            }
          },
          (err, nodes) => {
            if (err) {
              return done(err)
            }

            testNodes = nodes
            relaySpy1 = sinon.spy(testNodes['relayNode1'].swarm.transports['Circuit'].listeners[0].hopHandler, 'handle')
            relaySpy2 = sinon.spy(testNodes['relayNode2'].swarm.transports['Circuit'].listeners[0].hopHandler, 'handle')

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
            return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ipfs/${testNodes['relayNode2'].peerInfo.id.toB58String()}`
          })).to.be.ok()

          expect(relaySpy2.args.some((a) => {
            return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ipfs/${testNodes['nodeB'].peerInfo.id.toB58String()}`
          })).to.be.ok()

          expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
          done(err)
        })
      })

      it('dial over the correct chained relay addr and transport', function (done) {
        utils.dialAndReverse(testNodes['nodeB'], testNodes['nodeA'], ['hello'], (err, result) => {
          expect(err).to.be.null()
          expect(relaySpy1.called).to.be.ok()
          expect(relaySpy2.called).to.be.ok()

          expect(relaySpy1.args.some((a) => {
            return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ipfs/${testNodes['nodeA'].peerInfo.id.toB58String()}`
          })).to.be.ok()

          expect(relaySpy2.args.some((a) => {
            return a[0].dstPeer && a[0].dstPeer.addrs[0].toString() === `/ip4/0.0.0.0/tcp/9031/ipfs/${testNodes['relayNode1'].peerInfo.id.toB58String()}`
          })).to.be.ok()

          expect(result[0]).to.equal('hello'.split('').reverse('').join(''))
          done(err)
        })
      })
    })
  })
})

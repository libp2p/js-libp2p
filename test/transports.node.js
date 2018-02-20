/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
const signalling = require('libp2p-webrtc-star/src/sig-server')
const rendezvous = require('libp2p-websocket-star-rendezvous')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const WSStar = require('libp2p-websocket-star')
const WRTCStar = require('libp2p-webrtc-star')
const wrtc = require('wrtc')

const createNode = require('./utils/create-node.js')
const tryEcho = require('./utils/try-echo')
const echo = require('./utils/echo')

describe('transports', () => {
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
      nodeA.dialProtocol(nodeB.peerInfo, '/echo/1.0.0', (err, conn) => {
        expect(err).to.not.exist()

        tryEcho(conn, done)
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
              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(0)
              cb()
            },
            (cb) => {
              const peers = nodeB.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)

              expect(Object.keys(nodeB._switch.muxedConns)).to.have.length(0)
              cb()
            }
          ], done)
        }
      })
    })

    it('nodeA.dialProtocol nodeB using multiaddr', (done) => {
      nodeA.dialProtocol(nodeB.peerInfo.multiaddrs.toArray()[0], '/echo/1.0.0', (err, conn) => {
        // Some time for Identify to finish
        setTimeout(check, 500)

        function check () {
          expect(err).to.not.exist()
          series([
            (cb) => {
              const peers = nodeA.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)

              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(1)
              cb()
            },
            (cb) => {
              const peers = nodeB.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)

              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(1)
              cb()
            }
          ], () => tryEcho(conn, done))
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

              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(0)
              cb()
            },
            (cb) => {
              const peers = nodeB.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)

              expect(Object.keys(nodeB._switch.muxedConns)).to.have.length(0)
              cb()
            }
          ], done)
        }
      })
    })

    it('nodeA.dialProtocol nodeB using PeerId', (done) => {
      nodeA.dialProtocol(nodeB.peerInfo.id, '/echo/1.0.0', (err, conn) => {
        // Some time for Identify to finish
        setTimeout(check, 500)

        function check () {
          expect(err).to.not.exist()
          series([
            (cb) => {
              const peers = nodeA.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(1)
              cb()
            },
            (cb) => {
              const peers = nodeB.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(1)
              cb()
            }
          ], () => tryEcho(conn, done))
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
              expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(0)
              cb()
            },
            (cb) => {
              const peers = nodeB.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeB._switch.muxedConns)).to.have.length(0)
              cb()
            }
          ], done)
        }
      })
    })
  })

  describe('TCP + WebSockets', () => {
    let nodeTCP
    let nodeTCPnWS
    let nodeWS

    before((done) => {
      parallel([
        (cb) => createNode([
          '/ip4/0.0.0.0/tcp/0'
        ], (err, node) => {
          expect(err).to.not.exist()
          nodeTCP = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode([
          '/ip4/0.0.0.0/tcp/0',
          '/ip4/127.0.0.1/tcp/25011/ws'
        ], (err, node) => {
          expect(err).to.not.exist()
          nodeTCPnWS = node
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
        })
      ], done)
    })

    after((done) => {
      parallel([
        (cb) => nodeTCP.stop(cb),
        (cb) => nodeTCPnWS.stop(cb),
        (cb) => nodeWS.stop(cb)
      ], done)
    })

    it('nodeTCP.dial nodeTCPnWS using PeerInfo', (done) => {
      nodeTCP.dial(nodeTCPnWS.peerInfo, (err) => {
        expect(err).to.not.exist()

        // Some time for Identify to finish
        setTimeout(check, 500)

        function check () {
          parallel([
            (cb) => {
              const peers = nodeTCP.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeTCP._switch.muxedConns)).to.have.length(1)
              cb()
            },
            (cb) => {
              const peers = nodeTCPnWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeTCPnWS._switch.muxedConns)).to.have.length(1)
              cb()
            }
          ], done)
        }
      })
    })

    it('nodeTCP.hangUp nodeTCPnWS using PeerInfo', (done) => {
      nodeTCP.hangUp(nodeTCPnWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          parallel([
            (cb) => {
              const peers = nodeTCP.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeTCP._switch.muxedConns)).to.have.length(0)

              cb()
            },
            (cb) => {
              const peers = nodeTCPnWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeTCPnWS._switch.muxedConns)).to.have.length(0)
              cb()
            }
          ], done)
        }
      })
    })

    it('nodeTCPnWS.dial nodeWS using PeerInfo', (done) => {
      nodeTCPnWS.dial(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()

        // Some time for Identify to finish
        setTimeout(check, 500)

        function check () {
          parallel([
            (cb) => {
              const peers = nodeTCPnWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(2)
              expect(Object.keys(nodeTCPnWS._switch.muxedConns)).to.have.length(1)
              cb()
            },
            (cb) => {
              const peers = nodeWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeWS._switch.muxedConns)).to.have.length(1)
              cb()
            }
          ], done)
        }
      })
    })

    it('nodeTCPnWS.hangUp nodeWS using PeerInfo', (done) => {
      nodeTCPnWS.hangUp(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        setTimeout(check, 500)

        function check () {
          parallel([
            (cb) => {
              const peers = nodeTCPnWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(2)
              expect(Object.keys(nodeTCPnWS._switch.muxedConns)).to.have.length(0)

              cb()
            },
            (cb) => {
              const peers = nodeWS.peerBook.getAll()
              expect(Object.keys(peers)).to.have.length(1)
              expect(Object.keys(nodeWS._switch.muxedConns)).to.have.length(0)
              cb()
            }
          ], done)
        }
      })
    })

    // Until https://github.com/libp2p/js-libp2p/issues/46 is resolved
    // Everynode will be able to dial in WebSockets
    it.skip('nodeTCP.dial nodeWS using PeerInfo is unsuccesful', (done) => {
      nodeTCP.dial(nodeWS.peerInfo, (err) => {
        expect(err).to.exist()
        done()
      })
    })
  })

  describe('TCP + WebSockets + WebRTCStar', () => {
    let nodeAll
    let nodeTCP
    let nodeWS
    let nodeWebRTCStar

    let ss

    before(function (done) {
      this.timeout(5 * 1000)

      parallel([
        (cb) => signalling.start({ port: 24642 }, (err, server) => {
          expect(err).to.not.exist()
          ss = server
          cb()
        }),
        (cb) => {
          const wstar = new WRTCStar({wrtc: wrtc})

          createNode([
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/127.0.0.1/tcp/25011/ws',
            '/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star'
          ], {
            modules: {
              transport: [
                TCP,
                WS,
                wstar
              ],
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
          const wstar = new WRTCStar({wrtc: wrtc})

          createNode([
            '/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star'
          ], {
            modules: {
              transport: [wstar],
              discovery: [wstar.discovery]
            }
          }, (err, node) => {
            expect(err).to.not.exist()
            nodeWebRTCStar = node
            node.handle('/echo/1.0.0', echo)
            node.start(cb)
          })
        }
      ], done)
    })

    after(function (done) {
      this.timeout(10 * 1000)

      parallel([
        (cb) => nodeAll.stop(cb),
        (cb) => nodeTCP.stop(cb),
        (cb) => nodeWS.stop(cb),
        (cb) => nodeWebRTCStar.stop(cb),
        (cb) => ss.stop(cb)
      ], done)
    })

    function check (otherNode, muxed, peers, callback) {
      let i = 1;
      [nodeAll, otherNode].forEach((node) => {
        expect(Object.keys(node.peerBook.getAll())).to.have.length(i-- ? peers : 1)
        expect(Object.keys(node._switch.muxedConns)).to.have.length(muxed)
      })
      callback()
    }

    it('nodeAll.dial nodeTCP using PeerInfo', (done) => {
      nodeAll.dial(nodeTCP.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeTCP, 1, 1, done), 500)
      })
    })

    it('nodeAll.hangUp nodeTCP using PeerInfo', (done) => {
      nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeTCP, 0, 1, done), 500)
      })
    })

    it('nodeAll.dial nodeWS using PeerInfo', (done) => {
      nodeAll.dial(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWS, 1, 2, done), 500)
      })
    })

    it('nodeAll.hangUp nodeWS using PeerInfo', (done) => {
      nodeAll.hangUp(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWS, 0, 2, done), 500)
      })
    })

    it('nodeAll.dial nodeWebRTCStar using PeerInfo', function (done) {
      this.timeout(40 * 1000)

      nodeAll.dial(nodeWebRTCStar.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWebRTCStar, 1, 3, done), 500)
      })
    })

    it('nodeAll.hangUp nodeWebRTCStar using PeerInfo', (done) => {
      nodeAll.hangUp(nodeWebRTCStar.peerInfo, (err) => {
        expect(err).to.not.exist()
        setTimeout(() => check(nodeWebRTCStar, 0, 3, done), 500)
      })
    })
  })

  describe('TCP + WebSockets + WebSocketStar', () => {
    let nodeAll
    let nodeTCP
    let nodeWS
    let nodeWebSocketStar

    let ss

    before((done) => {
      parallel([
        (cb) => {
          rendezvous.start({ port: 24642 }, (err, server) => {
            expect(err).to.not.exist()
            ss = server
            cb()
          })
        },
        (cb) => {
          const wstar = new WSStar()

          createNode([
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/127.0.0.1/tcp/25011/ws',
            '/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star'
          ], {
            modules: {
              transport: [
                TCP,
                WS,
                wstar
              ],
              discovery: [wstar.discovery]
            }
          }, (err, node) => {
            expect(err).to.not.exist()
            nodeAll = node
            wstar.lazySetId(node.peerInfo.id)
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
          const wstar = new WSStar({})

          createNode([
            '/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star'
          ], {
            modules: {
              transport: [wstar],
              discovery: [wstar.discovery]
            }
          }, (err, node) => {
            expect(err).to.not.exist()
            nodeWebSocketStar = node
            wstar.lazySetId(node.peerInfo.id)
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
        (cb) => nodeWebSocketStar.stop(cb),
        (cb) => ss.stop(cb)
      ], done)
    })

    function check (otherNode, muxed, peers, done) {
      let i = 1;
      [nodeAll, otherNode].forEach((node) => {
        expect(Object.keys(node.peerBook.getAll())).to.have.length(i-- ? peers : 1)
        expect(Object.keys(node._switch.muxedConns)).to.have.length(muxed)
      })
      done()
    }

    it('nodeAll.dial nodeTCP using PeerInfo', (done) => {
      nodeAll.dial(nodeTCP.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeTCP, 1, 1, done), 500)
      })
    })

    it('nodeAll.hangUp nodeTCP using PeerInfo', (done) => {
      nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeTCP, 0, 1, done), 500)
      })
    })

    it('nodeAll.dial nodeWS using PeerInfo', (done) => {
      nodeAll.dial(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWS, 1, 2, done), 500)
      })
    })

    it('nodeAll.hangUp nodeWS using PeerInfo', (done) => {
      nodeAll.hangUp(nodeWS.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWS, 0, 2, done), 500)
      })
    })

    it('nodeAll.dial nodeWebSocketStar using PeerInfo', (done) => {
      nodeAll.dial(nodeWebSocketStar.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWebSocketStar, 1, 3, done), 500)
      })
    })

    it('nodeAll.hangUp nodeWebSocketStar using PeerInfo', (done) => {
      nodeAll.hangUp(nodeWebSocketStar.peerInfo, (err) => {
        expect(err).to.not.exist()
        // Some time for Identify to finish
        setTimeout(() => check(nodeWebSocketStar, 0, 3, done), 500)
      })
    })
  })
})

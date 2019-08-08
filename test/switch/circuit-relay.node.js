/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const sinon = require('sinon')
const once = require('once')
const parallel = require('async/parallel')
const series = require('async/series')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const multiplex = require('pull-mplex')
const PeerBook = require('peer-book')
const getPorts = require('portfinder').getPorts

const utils = require('./utils')
const createInfos = utils.createInfos
const Swarm = require('libp2p-switch')
const switchOptions = {
  denyTTL: 0 // nullifies denylisting
}

describe(`circuit`, function () {
  describe('basic', () => {
    let swarmA // TCP and WS
    let swarmB // WS
    let swarmC // no transports
    let dialSpyA

    before((done) => createInfos(3, (err, infos) => {
      expect(err).to.not.exist()

      const peerA = infos[0]
      const peerB = infos[1]
      const peerC = infos[2]

      peerA.multiaddrs.add('/ip4/0.0.0.0/tcp/9001')
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002/ws')

      swarmA = new Swarm(peerA, new PeerBook(), switchOptions)
      swarmB = new Swarm(peerB, new PeerBook())
      swarmC = new Swarm(peerC, new PeerBook())

      swarmA.transport.add('tcp', new TCP())
      swarmA.transport.add('ws', new WS())
      swarmB.transport.add('ws', new WS())

      dialSpyA = sinon.spy(swarmA.transport, 'dial')

      done()
    }))

    after((done) => {
      parallel([
        (cb) => swarmA.stop(cb),
        (cb) => swarmB.stop(cb)
      ], done)
    })

    it('circuit not enabled and all transports failed', (done) => {
      swarmA.dial(swarmC._peerInfo, (err, conn) => {
        expect(err).to.exist()
        expect(err).to.match(/Circuit not enabled and all transports failed to dial peer/)
        expect(conn).to.not.exist()
        done()
      })
    })

    it('.enableCircuitRelay', () => {
      swarmA.connection.enableCircuitRelay({ enabled: true })
      expect(Object.keys(swarmA.transports).length).to.equal(3)

      swarmB.connection.enableCircuitRelay({ enabled: true })
      expect(Object.keys(swarmB.transports).length).to.equal(2)
    })

    it('listed on the transports map', () => {
      expect(swarmA.transports.Circuit).to.exist()
      expect(swarmB.transports.Circuit).to.exist()
    })

    it('add /p2p-circuit addrs on start', (done) => {
      parallel([
        (cb) => swarmA.start(cb),
        (cb) => swarmB.start(cb)
      ], (err) => {
        expect(err).to.not.exist()
        expect(swarmA._peerInfo.multiaddrs.toArray().filter((a) => a.toString()
          .includes(`/p2p-circuit`)).length).to.be.at.least(3)
        // ensure swarmA has had 0.0.0.0 replaced in the addresses
        expect(swarmA._peerInfo.multiaddrs.toArray().filter((a) => a.toString()
          .includes(`/0.0.0.0`)).length).to.equal(0)
        expect(swarmB._peerInfo.multiaddrs.toArray().filter((a) => a.toString()
          .includes(`/p2p-circuit`)).length).to.be.at.least(2)
        done()
      })
    })

    it('dial circuit only once', (done) => {
      swarmA._peerInfo.multiaddrs.clear()
      swarmA._peerInfo.multiaddrs
        .add(`/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star`)

      swarmA.dial(swarmC._peerInfo, (err, conn) => {
        expect(err).to.exist()
        expect(err).to.match(/No available transports to dial peer/)
        expect(conn).to.not.exist()
        expect(dialSpyA.callCount).to.be.eql(1)
        done()
      })
    })

    it('dial circuit last', (done) => {
      const peerC = swarmC._peerInfo
      peerC.multiaddrs.clear()
      peerC.multiaddrs.add(`/p2p-circuit/ipfs/ABCD`)
      peerC.multiaddrs.add(`/ip4/127.0.0.1/tcp/9998/ipfs/ABCD`)
      peerC.multiaddrs.add(`/ip4/127.0.0.1/tcp/9999/ws/ipfs/ABCD`)

      swarmA.dial(peerC, (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()
        expect(dialSpyA.lastCall.args[0]).to.be.eql('Circuit')
        done()
      })
    })

    it('should not try circuit if no transports enabled', (done) => {
      swarmC.dial(swarmA._peerInfo, (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()

        expect(err).to.match(/No transports registered, dial not possible/)
        done()
      })
    })

    it('should not dial circuit if other transport succeed', (done) => {
      swarmA.dial(swarmB._peerInfo, (err) => {
        expect(err).not.to.exist()
        expect(dialSpyA.lastCall.args[0]).to.not.be.eql('Circuit')
        done()
      })
    })
  })

  describe('in a basic network', () => {
    // Create 5 nodes
    // Make node 1 act as a Bootstrap node and relay (speak tcp and ws)
    // Make nodes 2 & 3 speak tcp only
    // Make nodes 4 & 5 speak WS only
    // Have all nodes dial node 1
    // Each node should get the peers of node 1
    // Attempt to dial to each peer
    let bootstrapSwitch
    let tcpSwitch1
    let tcpSwitch2
    let wsSwitch1
    let wsSwitch2
    let bootstrapPeer
    let tcpPeer1
    let tcpPeer2
    let wsPeer1
    let wsPeer2

    before((done) => createInfos(5, (err, infos) => {
      expect(err).to.not.exist()

      getPorts(6, (err, ports) => {
        expect(err).to.not.exist()

        bootstrapPeer = infos[0]
        tcpPeer1 = infos[1]
        tcpPeer2 = infos[2]
        wsPeer1 = infos[3]
        wsPeer2 = infos[4]

        // Setup the addresses of our nodes
        bootstrapPeer.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}`)
        bootstrapPeer.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}/ws`)
        tcpPeer1.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}`)
        tcpPeer2.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}`)
        wsPeer1.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}/ws`)
        wsPeer2.multiaddrs.add(`/ip4/0.0.0.0/tcp/${ports.shift()}/ws`)

        // Setup the bootstrap node with the minimum needed for being a relay
        bootstrapSwitch = new Swarm(bootstrapPeer, new PeerBook())
        bootstrapSwitch.connection.addStreamMuxer(multiplex)
        bootstrapSwitch.connection.reuse()
        bootstrapSwitch.connection.enableCircuitRelay({
          enabled: true,
          // The relay needs to allow hopping
          hop: {
            enabled: true
          }
        })

        // Setup the tcp1 node with the minimum needed for dialing via a relay
        tcpSwitch1 = new Swarm(tcpPeer1, new PeerBook())
        tcpSwitch1.connection.addStreamMuxer(multiplex)
        tcpSwitch1.connection.reuse()
        tcpSwitch1.connection.enableCircuitRelay({
          enabled: true
        })

        // Setup tcp2 node to not be able to dial/listen over relay
        tcpSwitch2 = new Swarm(tcpPeer2, new PeerBook())
        tcpSwitch2.connection.reuse()
        tcpSwitch2.connection.addStreamMuxer(multiplex)

        // Setup the ws1 node with the minimum needed for dialing via a relay
        wsSwitch1 = new Swarm(wsPeer1, new PeerBook())
        wsSwitch1.connection.addStreamMuxer(multiplex)
        wsSwitch1.connection.reuse()
        wsSwitch1.connection.enableCircuitRelay({
          enabled: true
        })

        // Setup the ws2 node with the minimum needed for dialing via a relay
        wsSwitch2 = new Swarm(wsPeer2, new PeerBook())
        wsSwitch2.connection.addStreamMuxer(multiplex)
        wsSwitch2.connection.reuse()
        wsSwitch2.connection.enableCircuitRelay({
          enabled: true
        })

        bootstrapSwitch.transport.add('tcp', new TCP())
        bootstrapSwitch.transport.add('ws', new WS())
        tcpSwitch1.transport.add('tcp', new TCP())
        tcpSwitch2.transport.add('tcp', new TCP())
        wsSwitch1.transport.add('ws', new WS())
        wsSwitch2.transport.add('ws', new WS())

        series([
          // start the nodes
          (cb) => {
            parallel([
              (cb) => bootstrapSwitch.start(cb),
              (cb) => tcpSwitch1.start(cb),
              (cb) => tcpSwitch2.start(cb),
              (cb) => wsSwitch1.start(cb),
              (cb) => wsSwitch2.start(cb)
            ], cb)
          },
          // dial to the bootstrap node
          (cb) => {
            parallel([
              (cb) => tcpSwitch1.dial(bootstrapPeer, cb),
              (cb) => tcpSwitch2.dial(bootstrapPeer, cb),
              (cb) => wsSwitch1.dial(bootstrapPeer, cb),
              (cb) => wsSwitch2.dial(bootstrapPeer, cb)
            ], cb)
          }
        ], (err) => {
          if (err) return done(err)

          if (bootstrapSwitch._peerBook.getAllArray().length === 4) {
            return done()
          }

          done = once(done)
          // Wait for everyone to connect, before we try relaying
          bootstrapSwitch.on('peer-mux-established', () => {
            if (bootstrapSwitch._peerBook.getAllArray().length === 4) {
              done()
            }
          })
        })
      })
    }))

    before('wait so hop status can be negotiated', function (done) {
      setTimeout(done, 1000)
    })

    after(function (done) {
      parallel([
        (cb) => bootstrapSwitch.stop(cb),
        (cb) => tcpSwitch1.stop(cb),
        (cb) => tcpSwitch2.stop(cb),
        (cb) => wsSwitch1.stop(cb),
        (cb) => wsSwitch2.stop(cb)
      ], done)
    })

    it('should be able to dial tcp -> tcp', (done) => {
      tcpSwitch2.on('peer-mux-established', (peerInfo) => {
        if (peerInfo.id.toB58String() === tcpPeer1.id.toB58String()) {
          tcpSwitch2.removeAllListeners('peer-mux-established')
          done()
        }
      })
      tcpSwitch1.dial(tcpPeer2, (err, connection) => {
        expect(err).to.not.exist()
        // We're not dialing a protocol, so we won't get a connection back
        expect(connection).to.be.undefined()
      })
    })

    it('should be able to dial tcp -> ws over relay', (done) => {
      wsSwitch1.on('peer-mux-established', (peerInfo) => {
        if (peerInfo.id.toB58String() === tcpPeer1.id.toB58String()) {
          wsSwitch1.removeAllListeners('peer-mux-established')
          done()
        }
      })

      tcpSwitch1.dial(wsPeer1, (err, connection) => {
        expect(err).to.not.exist()
        // We're not dialing a protocol, so we won't get a connection back
        expect(connection).to.be.undefined()
      })
    })

    it('should be able to dial ws -> ws', (done) => {
      wsSwitch2.on('peer-mux-established', (peerInfo) => {
        if (peerInfo.id.toB58String() === wsPeer1.id.toB58String()) {
          wsSwitch2.removeAllListeners('peer-mux-established')
          done()
        }
      })
      wsSwitch1.dial(wsPeer2, (err, connection) => {
        expect(err).to.not.exist()
        // We're not dialing a protocol, so we won't get a connection back
        expect(connection).to.be.undefined()
      })
    })

    it('should be able to dial ws -> tcp over relay', (done) => {
      tcpSwitch1.on('peer-mux-established', (peerInfo) => {
        if (peerInfo.id.toB58String() === wsPeer2.id.toB58String()) {
          tcpSwitch1.removeAllListeners('peer-mux-established')
          expect(Object.keys(tcpSwitch1._peerBook.getAll())).to.include(wsPeer2.id.toB58String())
          done()
        }
      })

      wsSwitch2.dial(tcpPeer1, (err, connection) => {
        expect(err).to.not.exist()
        // We're not dialing a protocol, so we won't get a connection back
        expect(connection).to.be.undefined()
      })
    })

    it('shouldnt be able to dial to a non relay node', (done) => {
      // tcpPeer2 doesnt have relay enabled
      wsSwitch1.dial(tcpPeer2, (err, connection) => {
        expect(err).to.exist()
        expect(connection).to.not.exist()
        done()
      })
    })

    it('shouldnt be able to dial from a non relay node', (done) => {
      // tcpSwitch2 doesnt have relay enabled
      tcpSwitch2.dial(wsPeer1, (err, connection) => {
        expect(err).to.exist()
        expect(connection).to.not.exist()
        done()
      })
    })
  })
})

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(require('chai-checkmark'))
chai.use(dirtyChai)
const PeerBook = require('peer-book')
const parallel = require('async/parallel')
const WS = require('libp2p-websockets')
const TCP = require('libp2p-tcp')
const secio = require('libp2p-secio')
const multiplex = require('pull-mplex')
const pull = require('pull-stream')
const identify = require('libp2p-identify')

const utils = require('./utils')
const createInfos = utils.createInfos
const Switch = require('../src')

describe('dialFSM', () => {
  let switchA
  let switchB
  let switchC
  let peerAId
  let peerBId
  let protocol

  before((done) => createInfos(3, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]
    const peerC = infos[2]

    peerAId = peerA.id.toB58String()
    peerBId = peerB.id.toB58String()

    peerA.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    peerB.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    peerC.multiaddrs.add('/ip4/0.0.0.0/tcp/0/ws')
    // Give peer C a tcp address we wont actually support
    peerC.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

    switchA = new Switch(peerA, new PeerBook())
    switchB = new Switch(peerB, new PeerBook())
    switchC = new Switch(peerC, new PeerBook())

    switchA.transport.add('tcp', new TCP())
    switchB.transport.add('tcp', new TCP())
    switchC.transport.add('ws', new WS())

    switchA.connection.crypto(secio.tag, secio.encrypt)
    switchB.connection.crypto(secio.tag, secio.encrypt)
    switchC.connection.crypto(secio.tag, secio.encrypt)

    switchA.connection.addStreamMuxer(multiplex)
    switchB.connection.addStreamMuxer(multiplex)
    switchC.connection.addStreamMuxer(multiplex)

    switchA.connection.reuse()
    switchB.connection.reuse()
    switchC.connection.reuse()

    parallel([
      (cb) => switchA.start(cb),
      (cb) => switchB.start(cb),
      (cb) => switchC.start(cb)
    ], done)
  }))

  after((done) => {
    parallel([
      (cb) => switchA.stop(cb),
      (cb) => switchB.stop(cb),
      (cb) => switchC.stop(cb)
    ], done)
  })

  afterEach(() => {
    switchA.unhandle(protocol)
    switchB.unhandle(protocol)
    switchC.unhandle(protocol)
    protocol = null
  })

  it('should emit `error:connection_attempt_failed` when a transport fails to dial', (done) => {
    protocol = '/warn/1.0.0'
    switchC.handle(protocol, () => { })

    switchA.dialFSM(switchC._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()
      connFSM.once('error:connection_attempt_failed', (errors) => {
        expect(errors).to.be.an('array')
        expect(errors).to.have.length(1)
        done()
      })
    })
  })

  it('should emit an `error` event when a it cannot dial a peer', (done) => {
    protocol = '/error/1.0.0'
    switchC.handle(protocol, () => { })

    switchA.dialer.clearBlacklist(switchC._peerInfo)
    switchA.dialFSM(switchC._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()
      connFSM.once('error', (err) => {
        expect(err).to.be.exist()
        expect(err).to.have.property('code', 'CONNECTION_FAILED')
        done()
      })
    })
  })

  it('should error when the peer is blacklisted', (done) => {
    protocol = '/error/1.0.0'
    switchC.handle(protocol, () => { })

    switchA.dialer.clearBlacklist(switchC._peerInfo)
    switchA.dialFSM(switchC._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()
      connFSM.once('error', () => {
        // dial with the blacklist
        switchA.dialFSM(switchC._peerInfo, protocol, (err) => {
          expect(err).to.exist()
          expect(err.code).to.eql('ERR_BLACKLISTED')
          done()
        })
      })
    })
  })

  it('should emit a `closed` event when closed', (done) => {
    protocol = '/closed/1.0.0'
    switchB.handle(protocol, () => { })

    switchA.dialFSM(switchB._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()

      connFSM.once('close', () => {
        expect(switchA.connection.getAllById(peerBId)).to.have.length(0)
        done()
      })

      connFSM.once('muxed', () => {
        expect(switchA.connection.getAllById(peerBId)).to.have.length(1)
        connFSM.close()
      })
    })
  })

  it('should have the peers protocols once connected', (done) => {
    protocol = '/lscheck/1.0.0'
    switchB.handle(protocol, () => { })

    expect(4).checks(done)

    switchB.once('peer-mux-established', (peerInfo) => {
      const peerB = switchA._peerBook.get(switchB._peerInfo.id.toB58String())
      const peerA = switchB._peerBook.get(switchA._peerInfo.id.toB58String())
      // Verify the dialer knows the receiver's protocols
      expect(Array.from(peerB.protocols)).to.eql([
        multiplex.multicodec,
        identify.multicodec,
        protocol
      ]).mark()
      // Verify the receiver knows the dialer's protocols
      expect(Array.from(peerA.protocols)).to.eql([
        multiplex.multicodec,
        identify.multicodec
      ]).mark()

      switchA.hangUp(switchB._peerInfo)
    })

    switchA.dialFSM(switchB._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist().mark()

      connFSM.once('close', () => {
        // Just mark that close was called
        expect(true).to.eql(true).mark()
      })
    })
  })

  it('should close when the receiver closes', (done) => {
    protocol = '/closed/1.0.0'
    switchB.handle(protocol, () => { })

    // wait for the expects to happen
    expect(2).checks(() => {
      done()
    })

    switchB.on('peer-mux-established', (peerInfo) => {
      if (peerInfo.id.toB58String() === peerAId) {
        switchB.removeAllListeners('peer-mux-established')
        expect(switchB.connection.getAllById(peerAId)).to.have.length(1).mark()
        switchB.connection.getOne(peerAId).close()
      }
    })

    switchA.dialFSM(switchB._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()

      connFSM.once('close', () => {
        expect(switchA.connection.getAllById(peerBId)).to.have.length(0).mark()
      })
    })
  })

  it('parallel dials to the same peer should not create new connections', (done) => {
    switchB.handle('/parallel/2.0.0', (_, conn) => { pull(conn, conn) })

    parallel([
      (cb) => switchA.dialFSM(switchB._peerInfo, '/parallel/2.0.0', cb),
      (cb) => switchA.dialFSM(switchB._peerInfo, '/parallel/2.0.0', cb)
    ], (err, results) => {
      expect(err).to.not.exist()
      expect(results).to.have.length(2)
      expect(switchA.connection.getAllById(peerBId)).to.have.length(1)

      switchA.hangUp(switchB._peerInfo, () => {
        expect(switchA.connection.getAllById(peerBId)).to.have.length(0)
        done()
      })
    })
  })

  it('parallel dials to one another should disconnect on hangup', function (done) {
    this.timeout(10e3)
    protocol = '/parallel/1.0.0'

    switchA.handle(protocol, (_, conn) => { pull(conn, conn) })
    switchB.handle(protocol, (_, conn) => { pull(conn, conn) })

    expect(switchA.connection.getAllById(peerBId)).to.have.length(0)

    // Expect 4 `peer-mux-established` events
    expect(4).checks(() => {
      // Expect 4 `peer-mux-closed`, plus 1 hangup
      expect(5).checks(() => {
        switchA.removeAllListeners('peer-mux-closed')
        switchB.removeAllListeners('peer-mux-closed')
        switchA.removeAllListeners('peer-mux-established')
        switchB.removeAllListeners('peer-mux-established')
        done()
      })

      switchA.hangUp(switchB._peerInfo, (err) => {
        expect(err).to.not.exist().mark()
      })
    })

    switchA.on('peer-mux-established', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerBId).mark()
    })
    switchB.on('peer-mux-established', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerAId).mark()
    })

    switchA.on('peer-mux-closed', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerBId).mark()
    })
    switchB.on('peer-mux-closed', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerAId).mark()
    })

    switchA.dialFSM(switchB._peerInfo, protocol, (err, connFSM) => {
      expect(err).to.not.exist()
      // Hold the dial from A, until switch B is done dialing to ensure
      // we have both incoming and outgoing connections
      connFSM._state.on('DIALING:leave', (cb) => {
        switchB.dialFSM(switchA._peerInfo, protocol, (err, connB) => {
          expect(err).to.not.exist()
          connB.on('muxed', cb)
        })
      })
    })
  })

  it('parallel dials to one another should disconnect on stop', (done) => {
    protocol = '/parallel/1.0.0'
    switchA.handle(protocol, (_, conn) => { pull(conn, conn) })
    switchB.handle(protocol, (_, conn) => { pull(conn, conn) })

    // 4 close checks and 1 hangup check
    expect(5).checks(() => {
      switchA.removeAllListeners('peer-mux-closed')
      switchB.removeAllListeners('peer-mux-closed')
      // restart the node for subsequent tests
      switchA.start(done)
    })

    switchA.on('peer-mux-closed', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerBId).mark()
    })
    switchB.on('peer-mux-closed', (peerInfo) => {
      expect(peerInfo.id.toB58String()).to.eql(peerAId).mark()
    })

    switchA.dialFSM(switchB._peerInfo, '/parallel/1.0.0', (err, connFSM) => {
      expect(err).to.not.exist()
      // Hold the dial from A, until switch B is done dialing to ensure
      // we have both incoming and outgoing connections
      connFSM._state.on('DIALING:leave', (cb) => {
        switchB.dialFSM(switchA._peerInfo, '/parallel/1.0.0', (err, connB) => {
          expect(err).to.not.exist()
          connB.on('muxed', cb)
        })
      })

      connFSM.on('connection', () => {
        // Hangup and verify the connections are closed
        switchA.stop((err) => {
          expect(err).to.not.exist().mark()
        })
      })
    })
  })

  it('queued dials should be aborted on node stop', (done) => {
    switchB.handle('/abort-queue/1.0.0', (_, conn) => { pull(conn, conn) })

    switchA.dialFSM(switchB._peerInfo, '/abort-queue/1.0.0', (err, connFSM) => {
      expect(err).to.not.exist()
      connFSM._state.on('UPGRADING:enter', (cb) => {
        expect(2).checks(done)
        switchA.dialFSM(switchB._peerInfo, '/abort-queue/1.0.0', (err) => {
          expect(err).to.exist().mark()
        })
        switchA.dialFSM(switchB._peerInfo, '/abort-queue/1.0.0', (err) => {
          expect(err).to.exist().mark()
        })

        switchA.stop(cb)
      })
    })
  })
})

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const spdy = require('libp2p-spdy')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('../src')

describe('Switch (everything all together)', () => {
  let switchA // tcp
  let switchB // tcp+ws
  let switchC // tcp+ws
  let switchD // ws
  let switchE // ws

  before((done) => createInfos(5, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]
    const peerC = infos[2]
    const peerD = infos[3]
    const peerE = infos[4]

    switchA = new Switch(peerA, new PeerBook())
    switchB = new Switch(peerB, new PeerBook())
    switchC = new Switch(peerC, new PeerBook())
    switchD = new Switch(peerD, new PeerBook())
    switchE = new Switch(peerE, new PeerBook())

    done()
  }))

  after(function (done) {
    this.timeout(3 * 1000)

    parallel([
      (cb) => switchA.stop(cb),
      (cb) => switchB.stop(cb),
      (cb) => switchD.stop(cb),
      (cb) => switchE.stop(cb)
    ], done)
  })

  it('add tcp', (done) => {
    switchA._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
    switchB._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
    switchC._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')

    switchA.transport.add('tcp', new TCP())
    switchB.transport.add('tcp', new TCP())
    switchC.transport.add('tcp', new TCP())

    parallel([
      (cb) => switchA.transport.listen('tcp', {}, null, cb),
      (cb) => switchB.transport.listen('tcp', {}, null, cb)
    ], done)
  })

  it('add websockets', (done) => {
    switchB._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/9012/ws')
    switchC._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/9022/ws')
    switchD._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/9032/ws')
    switchE._peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/9042/ws')

    switchB.transport.add('ws', new WebSockets())
    switchC.transport.add('ws', new WebSockets())
    switchD.transport.add('ws', new WebSockets())
    switchE.transport.add('ws', new WebSockets())

    parallel([
      (cb) => switchB.transport.listen('ws', {}, null, cb),
      (cb) => switchD.transport.listen('ws', {}, null, cb),
      (cb) => switchE.transport.listen('ws', {}, null, cb)
    ], done)
  })

  it('listen automatically', (done) => {
    switchC.start(done)
  })

  it('add spdy and enable identify', () => {
    switchA.connection.addStreamMuxer(spdy)
    switchB.connection.addStreamMuxer(spdy)
    switchC.connection.addStreamMuxer(spdy)
    switchD.connection.addStreamMuxer(spdy)
    switchE.connection.addStreamMuxer(spdy)

    switchA.connection.reuse()
    switchB.connection.reuse()
    switchC.connection.reuse()
    switchD.connection.reuse()
    switchE.connection.reuse()
  })

  it('warm up from A to B on tcp to tcp+ws', (done) => {
    parallel([
      (cb) => switchB.once('peer-mux-established', (pi) => {
        expect(pi.id.toB58String()).to.equal(switchA._peerInfo.id.toB58String())
        cb()
      }),
      (cb) => switchA.once('peer-mux-established', (pi) => {
        expect(pi.id.toB58String()).to.equal(switchB._peerInfo.id.toB58String())
        cb()
      }),
      (cb) => switchA.dial(switchB._peerInfo, (err) => {
        expect(err).to.not.exist()
        expect(Object.keys(switchA.muxedConns).length).to.equal(1)
        cb()
      })
    ], done)
  })

  it('warm up a warmed up, from B to A', (done) => {
    switchB.dial(switchA._peerInfo, (err) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial from tcp to tcp+ws, on protocol', (done) => {
    switchB.handle('/anona/1.0.0', (protocol, conn) => pull(conn, conn))

    switchA.dial(switchB._peerInfo, '/anona/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
      tryEcho(conn, done)
    })
  })

  it('dial from ws to ws no proto', (done) => {
    switchD.dial(switchE._peerInfo, (err) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchD.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial from ws to ws', (done) => {
    switchE.handle('/abacaxi/1.0.0', (protocol, conn) => pull(conn, conn))

    switchD.dial(switchE._peerInfo, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchD.muxedConns).length).to.equal(1)

      tryEcho(conn, () => setTimeout(() => {
        expect(Object.keys(switchE.muxedConns).length).to.equal(1)
        done()
      }, 1000))
    })
  })

  it('dial from tcp to tcp+ws (returned conn)', (done) => {
    switchB.handle('/grapes/1.0.0', (protocol, conn) => pull(conn, conn))

    const conn = switchA.dial(switchB._peerInfo, '/grapes/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
    })

    tryEcho(conn, done)
  })

  it('dial from tcp+ws to tcp+ws', (done) => {
    let i = 0

    function check (err) {
      if (err) {
        return done(err)
      }

      if (i++ === 2) {
        done()
      }
    }

    switchC.handle('/mamao/1.0.0', (protocol, conn) => {
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist()
        expect(peerInfo).to.exist()
        check()
      })

      pull(conn, conn)
    })

    switchA.dial(switchC._peerInfo, '/mamao/1.0.0', (err, conn) => {
      expect(err).to.not.exist()

      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist()
        expect(peerInfo).to.exist()
        check()
      })
      expect(Object.keys(switchA.muxedConns).length).to.equal(2)

      expect(switchC._peerInfo.isConnected).to.exist()
      expect(switchA._peerInfo.isConnected).to.exist()

      tryEcho(conn, done)
    })
  })

  it('hangUp', (done) => {
    let count = 0
    const ready = () => ++count === 3 ? done() : null

    switchB.once('peer-mux-closed', (peerInfo) => {
      expect(Object.keys(switchB.muxedConns).length).to.equal(0)
      expect(switchB._peerInfo.isConnected()).to.not.exist()
      ready()
    })

    switchA.once('peer-mux-closed', (peerInfo) => {
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
      expect(switchA._peerInfo.isConnected()).to.not.exist()
      ready()
    })

    switchA.hangUp(switchB._peerInfo, (err) => {
      expect(err).to.not.exist()
      ready()
    })
  })

  it('close a muxer emits event', function (done) {
    this.timeout(3 * 1000)
    parallel([
      (cb) => switchC.stop(cb),
      (cb) => switchA.once('peer-mux-closed', (peerInfo) => cb())
    ], done)
  })
})

/* eslint-env mocha */
/* eslint no-warning-comments: off */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('libp2p-switch')

describe('transports', () => {
  [
    { n: 'TCP', C: TCP, maGen: (port) => { return `/ip4/127.0.0.1/tcp/${port}` } },
    { n: 'WS', C: WS, maGen: (port) => { return `/ip4/127.0.0.1/tcp/${port}/ws` } }
    // { n: 'UTP', C: UTP, maGen: (port) => { return `/ip4/127.0.0.1/udp/${port}/utp` } }
  ].forEach((t) => describe(t.n, () => {
    let switchA
    let switchB
    let morePeerInfo

    before(function (done) {
      this.timeout(10 * 1000)

      createInfos(9, (err, peerInfos) => {
        expect(err).to.not.exist()

        const peerA = peerInfos[0]
        const peerB = peerInfos[1]
        morePeerInfo = peerInfos.slice(2)

        peerA.multiaddrs.add(t.maGen(9888))
        peerB.multiaddrs.add(t.maGen(9999))
        switchA = new Switch(peerA, new PeerBook())
        switchB = new Switch(peerB, new PeerBook())
        done()
      })
    })

    after(function (done) {
      parallel([
        (next) => switchA.stop(next),
        (next) => switchB.stop(next)
      ], done)
    })

    it('.transport.remove', () => {
      switchA.transport.add('test', new t.C())
      expect(switchA.transports).to.have.any.keys(['test'])
      switchA.transport.remove('test')
      expect(switchA.transports).to.not.have.any.keys(['test'])
      // verify remove fails silently
      switchA.transport.remove('test')
    })

    it('.transport.removeAll', (done) => {
      switchA.transport.add('test', new t.C())
      switchA.transport.add('test2', new t.C())
      expect(switchA.transports).to.have.any.keys(['test', 'test2'])
      switchA.transport.removeAll(() => {
        expect(switchA.transports).to.not.have.any.keys(['test', 'test2'])
        done()
      })
    })

    it('.transport.add', () => {
      switchA.transport.add(t.n, new t.C())
      expect(Object.keys(switchA.transports).length).to.equal(1)

      switchB.transport.add(t.n, new t.C())
      expect(Object.keys(switchB.transports).length).to.equal(1)
    })

    it('.transport.listen', (done) => {
      let count = 0

      switchA.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)
      switchB.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)

      function ready () {
        if (++count === 2) {
          expect(switchA._peerInfo.multiaddrs.size).to.equal(1)
          expect(switchB._peerInfo.multiaddrs.size).to.equal(1)
          done()
        }
      }
    })

    it('.transport.dial to a multiaddr', (done) => {
      const peer = morePeerInfo[0]
      peer.multiaddrs.add(t.maGen(9999))

      switchA.transport.dial(t.n, peer, (err, conn) => {
        expect(err).to.not.exist()
        tryEcho(conn, done)
      })
    })

    it('.transport.dial to set of multiaddr, only one is available', (done) => {
      const peer = morePeerInfo[1]
      peer.multiaddrs.add(t.maGen(9359))
      peer.multiaddrs.add(t.maGen(9329))
      peer.multiaddrs.add(t.maGen(9910))
      peer.multiaddrs.add(switchB._peerInfo.multiaddrs.toArray()[0]) // the valid address
      peer.multiaddrs.add(t.maGen(9309))
      // addr not supported added on purpose
      peer.multiaddrs.add('/ip4/1.2.3.4/tcp/3456/ws/p2p-webrtc-star')

      switchA.transport.dial(t.n, peer, (err, conn) => {
        expect(err).to.not.exist()
        tryEcho(conn, done)
      })
    })

    it('.transport.dial to set of multiaddr, none is available', (done) => {
      const peer = morePeerInfo[2]
      peer.multiaddrs.add(t.maGen(9359))
      peer.multiaddrs.add(t.maGen(9329))
      // addr not supported added on purpose
      peer.multiaddrs.add('/ip4/1.2.3.4/tcp/3456/ws/p2p-webrtc-star')

      switchA.transport.dial(t.n, peer, (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()
        done()
      })
    })

    it('.close', function (done) {
      this.timeout(2500)

      parallel([
        (cb) => switchA.transport.close(t.n, cb),
        (cb) => switchB.transport.close(t.n, cb)
      ], done)
    })

    it('support port 0', (done) => {
      const ma = t.maGen(0)
      const peer = morePeerInfo[3]
      peer.multiaddrs.add(ma)

      const sw = new Switch(peer, new PeerBook())
      sw.transport.add(t.n, new t.C())
      sw.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)

      function ready () {
        expect(peer.multiaddrs.size).to.equal(1)
        // should not have /tcp/0 anymore
        expect(peer.multiaddrs.has(ma)).to.equal(false)
        sw.stop(done)
      }
    })

    it('support addr 0.0.0.0', (done) => {
      const ma = t.maGen(9050).replace('127.0.0.1', '0.0.0.0')
      const peer = morePeerInfo[4]
      peer.multiaddrs.add(ma)

      const sw = new Switch(peer, new PeerBook())
      sw.transport.add(t.n, new t.C())
      sw.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)

      function ready () {
        expect(peer.multiaddrs.size >= 1).to.equal(true)
        expect(peer.multiaddrs.has(ma)).to.equal(false)
        sw.stop(done)
      }
    })

    it('support addr 0.0.0.0:0', (done) => {
      const ma = t.maGen(9050).replace('127.0.0.1', '0.0.0.0')
      const peer = morePeerInfo[5]
      peer.multiaddrs.add(ma)

      const sw = new Switch(peer, new PeerBook())
      sw.transport.add(t.n, new t.C())
      sw.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)

      function ready () {
        expect(peer.multiaddrs.size >= 1).to.equal(true)
        expect(peer.multiaddrs.has(ma)).to.equal(false)
        sw.stop(done)
      }
    })

    it('listen in several addrs', function (done) {
      this.timeout(12000)
      const peer = morePeerInfo[6]

      peer.multiaddrs.add(t.maGen(9001))
      peer.multiaddrs.add(t.maGen(9002))
      peer.multiaddrs.add(t.maGen(9003))

      const sw = new Switch(peer, new PeerBook())
      sw.transport.add(t.n, new t.C())
      sw.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)

      function ready () {
        expect(peer.multiaddrs.size).to.equal(3)
        sw.stop(done)
      }
    })

    it('handles EADDRINUSE error when trying to listen', (done) => {
      // TODO: fix libp2p-websockets to not throw Uncaught Error in this test
      if (t.n === 'WS') { return done() }

      const switch1 = new Switch(switchA._peerInfo, new PeerBook())
      let switch2

      switch1.transport.add(t.n, new t.C())
      switch1.transport.listen(t.n, {}, (conn) => pull(conn, conn), () => {
        // Add in-use (peerA) address to peerB
        switchB._peerInfo.multiaddrs.add(t.maGen(9888))

        switch2 = new Switch(switchB._peerInfo, new PeerBook())
        switch2.transport.add(t.n, new t.C())
        switch2.transport.listen(t.n, {}, (conn) => pull(conn, conn), ready)
      })

      function ready (err) {
        expect(err).to.exist()
        expect(err.code).to.equal('EADDRINUSE')
        switch1.stop(() => switch2.stop(done))
      }
    })
  }))
})

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const peerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebRTCStar = require('libp2p-webrtc-star')
const spdy = require('libp2p-spdy')
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')
const PeerBook = require('peer-book')
const tryEcho = require('./utils').tryEcho

const Switch = require('libp2p-switch')

describe('Switch (webrtc-star)', () => {
  let switch1
  let peer1
  let wstar1

  let switch2
  let peer2
  let wstar2

  before((done) => series([
    (cb) => peerId.create((err, id1) => {
      expect(err).to.not.exist()
      peer1 = new PeerInfo(id1)
      const ma1 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' +
        id1.toB58String()
      peer1.multiaddrs.add(ma1)
      cb()
    }),
    (cb) => peerId.create((err, id2) => {
      expect(err).to.not.exist()
      peer2 = new PeerInfo(id2)
      const ma2 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' +
        id2.toB58String()
      peer2.multiaddrs.add(ma2)
      cb()
    })
  ], (err) => {
    expect(err).to.not.exist()

    switch1 = new Switch(peer1, new PeerBook())
    switch2 = new Switch(peer2, new PeerBook())
    done()
  }))

  it('add WebRTCStar transport to switch 1', () => {
    wstar1 = new WebRTCStar()
    switch1.transport.add('wstar', wstar1)
    expect(Object.keys(switch1.transports).length).to.equal(1)
  })

  it('add WebRTCStar transport to switch 2', () => {
    wstar2 = new WebRTCStar()
    switch2.transport.add('wstar', wstar2)
    expect(Object.keys(switch2.transports).length).to.equal(1)
  })

  it('listen on switch 1', (done) => {
    switch1.start(done)
  })

  it('listen on switch 2', (done) => {
    switch2.start(done)
  })

  it('add spdy', () => {
    switch1.connection.addStreamMuxer(spdy)
    switch1.connection.reuse()
    switch2.connection.addStreamMuxer(spdy)
    switch2.connection.reuse()
  })

  it('handle proto', () => {
    switch2.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
  })

  it('dial on proto', (done) => {
    switch1.dial(peer2, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(switch1.connection.getAll()).to.have.length(1)

      tryEcho(conn, () => {
        expect(switch2.connection.getAll()).to.have.length(1)
        done()
      })
    })
  })

  it('create a third node and check that discovery works', function (done) {
    this.timeout(20 * 1000)

    let counter = 0

    let switch3

    function check () {
      if (++counter === 4) {
        const s1n = switch1.connection.getAll()
        const s2n = switch2.connection.getAll()
        const s3n = switch3.connection.getAll()
        expect(s1n).to.have.length(2)
        expect(s2n).to.have.length(2)
        expect(s3n).to.have.length(2)
        switch3.stop(done)
      }
      if (counter === 3) {
        setTimeout(check, 2000)
      }
    }

    wstar1.discovery.on('peer', (peerInfo) => switch1.dial(peerInfo, check))
    wstar2.discovery.on('peer', (peerInfo) => switch2.dial(peerInfo, check))

    peerId.create((err, id3) => {
      expect(err).to.not.exist()

      const peer3 = new PeerInfo(id3)
      const mh3 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/' + id3.toB58String()
      peer3.multiaddrs.add(mh3)

      switch3 = new Switch(peer3, new PeerBook())
      const wstar3 = new WebRTCStar()
      switch3.transport.add('wstar', wstar3)
      switch3.connection.addStreamMuxer(spdy)
      switch3.connection.reuse()
      switch3.start(check)
    })
  })

  it('stop', (done) => {
    parallel([
      (cb) => switch1.stop(cb),
      (cb) => switch2.stop(cb)
    ], done)
  })
})

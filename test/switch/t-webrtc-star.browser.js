/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebRTCStar = require('libp2p-webrtc-star')
const parallel = require('async/parallel')
const pull = require('pull-stream')
const PeerBook = require('peer-book')
const tryEcho = require('./utils').tryEcho

const Switch = require('../../src/switch')

describe('transport - webrtc-star', () => {
  let switch1
  let switch2

  before(() => {
    const id1 = PeerId
      .createFromB58String('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA')
    const peer1 = new PeerInfo(id1)

    const ma1 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA'
    peer1.multiaddrs.add(ma1)

    const id2 = PeerId
      .createFromB58String('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB')
    const peer2 = new PeerInfo(id2)
    const ma2 = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB'
    peer2.multiaddrs.add(ma2)

    switch1 = new Switch(peer1, new PeerBook())
    switch2 = new Switch(peer2, new PeerBook())
  })

  it('add WebRTCStar transport to switch 1', () => {
    switch1.transport.add('wstar', new WebRTCStar())
    expect(Object.keys(switch1.transports).length).to.equal(1)
  })

  it('add WebRTCStar transport to switch 2', () => {
    switch2.transport.add('wstar', new WebRTCStar())
    expect(Object.keys(switch2.transports).length).to.equal(1)
  })

  it('listen on switch 1', (done) => {
    switch1.transport.listen('wstar', {}, (conn) => pull(conn, conn), done)
  })

  it('listen on switch 2', (done) => {
    switch2.transport.listen('wstar', {}, (conn) => pull(conn, conn), done)
  })

  it('dial', (done) => {
    switch1.transport.dial('wstar', switch2._peerInfo, (err, conn) => {
      expect(err).to.not.exist()

      tryEcho(conn, done)
    })
  })
  it('dial offline / non-existent node', (done) => {
    const peer2 = switch2._peerInfo
    peer2.multiaddrs.clear()
    peer2.multiaddrs.add('/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/ABCD')

    switch1.transport.dial('wstar', peer2, (err, conn) => {
      expect(err).to.exist()
      expect(conn).to.not.exist()
      done()
    })
  })

  it('close', (done) => {
    parallel([
      (cb) => switch1.transport.close('wstar', cb),
      (cb) => switch2.transport.close('wstar', cb)
    ], done)
  })
})

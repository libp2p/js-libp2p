/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')

const Swarm = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const series = require('async/series')
const parallel = require('async/parallel')

const Ping = require('./../src')

describe('libp2p ping', () => {
  let swarmA
  let swarmB
  let peerA
  let peerB

  before(function (done) {
    this.timeout(20 * 1000)
    series([
      (cb) => PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()
        peerA = peerInfo
        peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
        cb()
      }),
      (cb) => PeerInfo.create((err, peerInfo) => {
        expect(err).to.not.exist()
        peerB = peerInfo
        peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
        cb()
      }),
      (cb) => {
        swarmA = new Swarm(peerA, new PeerBook())
        swarmB = new Swarm(peerB, new PeerBook())
        swarmA.transport.add('tcp', new TCP())
        swarmB.transport.add('tcp', new TCP())
        cb()
      },
      (cb) => swarmA.start(cb),
      (cb) => swarmB.start(cb),
      (cb) => {
        Ping.mount(swarmA)
        Ping.mount(swarmB)
        cb()
      }
    ], done)
  })

  after((done) => {
    parallel([
      (cb) => swarmA.stop(cb),
      (cb) => swarmB.stop(cb)
    ], done)
  })

  it('ping once from peerA to peerB', (done) => {
    const p = new Ping(swarmA, peerB)

    p.on('error', (err) => {
      expect(err).to.not.exist()
    })

    p.on('ping', (time) => {
      expect(time).to.be.a('Number')
      p.stop()
      done()
    })

    p.start()
  })

  it('ping 5 times from peerB to peerA', (done) => {
    const p = new Ping(swarmB, peerA)

    p.on('error', (err) => {
      expect(err).to.not.exist()
    })

    let counter = 0

    p.on('ping', (time) => {
      expect(time).to.be.a('Number')
      if (++counter === 5) {
        p.stop()
        done()
      }
    })

    p.start()
  })

  it('cannot ping itself', (done) => {
    const p = new Ping(swarmA, peerA)

    p.on('error', (err) => {
      expect(err).to.exist()
      done()
    })

    p.on('ping', () => {
      expect.fail('should not be called')
    })

    p.start()
  })

  it('unmount PING protocol', () => {
    Ping.unmount(swarmA)
    Ping.unmount(swarmB)
  })
})

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const sinon = require('sinon')

const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const PeerBook = require('peer-book')

const utils = require('./utils')
const Swarm = require('../src')

describe(`circuit`, function () {
  let swarmA // TCP
  let peerA
  let swarmB // WS
  let peerB
  let swarmC // no transports
  let peerC // just a peer
  let dialSpyA

  before((done) => {
    utils.createInfos(3, (err, infos) => {
      if (err) {
        return done(err)
      }

      peerA = infos[0]
      peerB = infos[1]
      peerC = infos[2]

      peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002/ws')

      swarmA = new Swarm(peerA, new PeerBook())
      swarmB = new Swarm(peerB, new PeerBook())
      swarmC = new Swarm(peerC, new PeerBook())

      swarmA.transport.add('tcp', new TCP())
      swarmA.transport.add('WebSockets', new WS())

      swarmB.transport.add('WebSockets', new WS())

      dialSpyA = sinon.spy(swarmA.transport, 'dial')

      done()
    })
  })

  after((done) => {
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb)
    ], done)
  })

  it(`.enableCircuitRelay - should enable circuit transport`, function () {
    swarmA.connection.enableCircuitRelay({
      enabled: true
    })
    expect(Object.keys(swarmA.transports).length).to.equal(3)

    swarmB.connection.enableCircuitRelay({
      enabled: true
    })
    expect(Object.keys(swarmB.transports).length).to.equal(2)
  })

  it(`should add to transport array`, function () {
    expect(swarmA.transports['Circuit']).to.exist()
    expect(swarmB.transports['Circuit']).to.exist()
  })

  it(`should add /p2p-curcuit addrs on listen`, function (done) {
    parallel([
      (cb) => swarmA.listen(cb),
      (cb) => swarmB.listen(cb)
    ], (err) => {
      expect(err).to.not.exist()
      expect(peerA.multiaddrs.toArray().filter((a) => a.toString().includes(`/p2p-circuit`)).length).to.be.eql(2)
      expect(peerB.multiaddrs.toArray().filter((a) => a.toString().includes(`/p2p-circuit`)).length).to.be.eql(2)
      done()
    })
  })

  it(`should dial circuit last`, function (done) {
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

  it(`should not try circuit if not enabled`, function (done) {
    swarmC.dial(peerA, (err, conn) => {
      expect(err).to.exist()
      expect(conn).to.not.exist()

      expect(err).to.match(/Could not dial in any of the transports or relays/)
      done()
    })
  })

  it(`should not dial circuit if other transport succeed`, function (done) {
    swarmA.dial(peerB, (err) => {
      expect(err).not.to.exist()
      expect(dialSpyA.lastCall.args[0]).to.not.be.eql('Circuit')
      done()
    })
  })
})

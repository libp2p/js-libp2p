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
const createInfos = utils.createInfos
// const tryEcho = utils.tryEcho
const Swarm = require('../src')

describe(`circuit`, function () {
  let swarmA // TCP
  let swarmB // WS
  let swarmC // no transports
  let dialSpyA

  before((done) => createInfos(3, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]
    const peerC = infos[2]

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002/ws')

    swarmA = new Swarm(peerA, new PeerBook())
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
    expect(swarmA.transports['Circuit']).to.exist()
    expect(swarmB.transports['Circuit']).to.exist()
  })

  it('add /p2p-curcuit addrs on start', (done) => {
    parallel([
      (cb) => swarmA.start(cb),
      (cb) => swarmB.start(cb)
    ], (err) => {
      expect(err).to.not.exist()
      expect(swarmA._peerInfo.multiaddrs.toArray().filter((a) => a.toString()
        .includes(`/p2p-circuit`)).length).to.equal(2)
      expect(swarmB._peerInfo.multiaddrs.toArray().filter((a) => a.toString()
        .includes(`/p2p-circuit`)).length).to.equal(2)
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

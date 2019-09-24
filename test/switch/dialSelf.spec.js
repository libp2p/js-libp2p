'use strict'

/* eslint-env mocha */

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const { EventEmitter } = require('events')
const PeerBook = require('peer-book')
const Duplex = require('pull-pair/duplex')

const utils = require('./utils')
const createInfos = utils.createInfos
const Swarm = require('../../src/switch')

class MockTransport extends EventEmitter {
  constructor () {
    super()
    this.conn = Duplex()
  }

  dial (addr, cb) {
    const c = this.conn[0]
    this.emit('connection', this.conn[1])
    setImmediate(() => cb(null, c))
    return c
  }

  listen (addr, cb) {
    return cb()
  }

  filter (mas) {
    return Array.isArray(mas) ? mas : [mas]
  }
}

describe('dial self', () => {
  let swarmA
  let peerInfos

  before((done) => createInfos(2, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos.shift()
    peerInfos = infos

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerA.multiaddrs.add(`/ip4/127.0.0.1/tcp/9001/ipfs/${peerA.id.toB58String()}`)
    peerA.multiaddrs.add(`/ip4/127.0.0.1/tcp/9001/p2p-circuit/ipfs/${peerA.id.toB58String()}`)
    peerA.multiaddrs.add('/ip4/0.0.0.0/tcp/9001')
    peerA.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/ipfs/${peerA.id.toB58String()}`)
    peerA.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/p2p-circuit/ipfs/${peerA.id.toB58String()}`)

    swarmA = new Swarm(peerA, new PeerBook())

    swarmA.transport.add('tcp', new MockTransport())

    done()
  }))

  after((done) => swarmA.stop(done))

  it('node should not be able to dial itself', (done) => {
    swarmA.dial(swarmA._peerInfo, (err, conn) => {
      expect(err).to.exist()
      expect(() => { throw err }).to.throw(/A node cannot dial itself/)
      expect(conn).to.not.exist()
      done()
    })
  })

  it('node should not be able to dial another peers address that matches its own', (done) => {
    const peerB = peerInfos.shift()
    peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerB.multiaddrs.add('/ip4/0.0.0.0/tcp/9001')
    peerB.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/ipfs/${peerB.id.toB58String()}`)

    swarmA.dial(peerB, (err, conn) => {
      expect(err).to.exist()
      expect(err.code).to.eql('CONNECTION_FAILED')
      expect(conn).to.not.exist()
      done()
    })
  })
})

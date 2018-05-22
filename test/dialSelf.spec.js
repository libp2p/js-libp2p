'use strict'

/* eslint-env mocha */

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const PeerBook = require('peer-book')
const Duplex = require('pull-pair/duplex')

const utils = require('./utils')
const createInfos = utils.createInfos
const Swarm = require('../src')

class MockTransport {
  constructor () {
    this.conn = Duplex()
  }
  dial (addr, cb) {
    let c = this.conn[0]
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

describe(`dial self`, () => {
  let swarmA

  before((done) => createInfos(3, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')

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
})

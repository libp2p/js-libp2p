/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('../src')

describe('Switch (no Stream Multiplexing)', () => {
  let switchA
  let switchB

  before((done) => createInfos(2, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC')

    switchA = new Switch(peerA, new PeerBook())
    switchB = new Switch(peerB, new PeerBook())

    switchA.transport.add('tcp', new TCP())
    switchB.transport.add('tcp', new TCP())

    parallel([
      (cb) => switchA.transport.listen('tcp', {}, null, cb),
      (cb) => switchB.transport.listen('tcp', {}, null, cb)
    ], done)
  }))

  after((done) => parallel([
    (cb) => switchA.stop(cb),
    (cb) => switchB.stop(cb)
  ], done))

  it('handle a protocol', (done) => {
    switchB.handle('/bananas/1.0.0', (protocol, conn) => pull(conn, conn))
    expect(Object.keys(switchB.protocols).length).to.equal(2)
    done()
  })

  it('dial on protocol', (done) => {
    switchB.handle('/pineapple/1.0.0', (protocol, conn) => pull(conn, conn))

    switchA.dial(switchB._peerInfo, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      tryEcho(conn, done)
    })
  })

  it('dial on protocol (returned conn)', (done) => {
    switchB.handle('/apples/1.0.0', (protocol, conn) => pull(conn, conn))

    const conn = switchA.dial(switchB._peerInfo, '/apples/1.0.0', (err) => {
      expect(err).to.not.exist()
    })

    tryEcho(conn, done)
  })

  it('dial to warm a conn', (done) => {
    switchA.dial(switchB._peerInfo, done)
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    switchA.dial(switchB._peerInfo, '/bananas/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      tryEcho(conn, done)
    })
  })

  it('unhandle', () => {
    const proto = '/bananas/1.0.0'
    switchA.unhandle(proto)
    expect(switchA.protocols[proto]).to.not.exist()
  })
})

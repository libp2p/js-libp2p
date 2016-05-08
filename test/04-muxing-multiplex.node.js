/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const parallel = require('run-parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-spdy')

describe('stream muxing with multiplex (on TCP)', function () {
  this.timeout(60 * 1000)

  var swarmA
  var peerA
  var swarmB
  var peerB
  var swarmC
  var peerC

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()
    peerC = new Peer()

    // console.log('peer A', peerA.id.toB58String())
    // console.log('peer B', peerB.id.toB58String())
    // console.log('peer C', peerC.id.toB58String())

    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
    peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    swarmC = new Swarm(peerC)

    swarmA.transport.add('tcp', new TCP())
    swarmB.transport.add('tcp', new TCP())
    swarmC.transport.add('tcp', new TCP())

    parallel([
      (cb) => swarmA.transport.listen('tcp', {}, null, cb),
      (cb) => swarmB.transport.listen('tcp', {}, null, cb),
      (cb) => swarmC.transport.listen('tcp', {}, null, cb)
    ], done)
  })

  after((done) => {
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb),
      (cb) => swarmC.close(cb)
    ], done)
  })

  it('add', (done) => {
    swarmA.connection.addStreamMuxer(multiplex)
    swarmB.connection.addStreamMuxer(multiplex)
    swarmC.connection.addStreamMuxer(multiplex)
    done()
  })

  it('handle + dial on protocol', (done) => {
    swarmB.handle('/abacaxi/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('dial to warm conn', (done) => {
    swarmB.dial(peerA, (err) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmB.conns).length).to.equal(0)
      expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarmA.handle('/papaia/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmB.dial(peerA, '/papaia/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmB.conns).length).to.equal(0)
      expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('enable identify to reuse incomming muxed conn', (done) => {
    swarmA.connection.reuse()
    swarmC.connection.reuse()

    swarmC.dial(peerA, (err) => {
      expect(err).to.not.exist
      setTimeout(() => {
        expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
        expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
        done()
      }, 500)
    })
  })
})
